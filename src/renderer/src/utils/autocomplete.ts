import type { BookmarkItem, HistoryItem, TabInfo } from '@/shared/types';
import { SUPPORTED_BANGS, parseBangQuery } from '@/shared/bangs';

export interface UrlSuggestion {
  id: string;
  type: 'top-hit' | 'history' | 'bookmark' | 'search' | 'bang' | 'tab';
  title: string;
  url: string;
  displayUrl: string;
  cleanDomain: string;
  favicon?: string;
  visitedAt?: number;
  tabId?: string;
}

/**
 * Strips protocol (http://, https://) and trailing slash for display and prefix matching
 */
export function cleanUrlForMatching(rawUrl: string): { cleanUrl: string; cleanDomain: string } {
  try {
    let s = rawUrl.trim();
    s = s.replace(/^https?:\/\//i, '');
    s = s.replace(/\/+$/, '');

    // Extract domain without leading www.
    const slashIdx = s.indexOf('/');
    let domain = slashIdx === -1 ? s : s.slice(0, slashIdx);
    if (domain.toLowerCase().startsWith('www.')) {
      domain = domain.slice(4);
    }

    let clean = s;
    if (clean.toLowerCase().startsWith('www.')) {
      clean = clean.slice(4);
    }
    return { cleanUrl: clean, cleanDomain: domain };
  } catch {
    return { cleanUrl: rawUrl, cleanDomain: rawUrl };
  }
}

/**
 * Strips tracking/noise query parameters (e.g. themeRefresh, fbclid, utm_*) and normalizes URLs.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    let s = rawUrl.trim();
    if (!s) return s;
    if (!s.includes('://')) {
      s = 'http://' + s;
    }
    const parsed = new URL(s);
    const noiseParams = new Set(['themerefresh', 'fbclid', 'gclid', 'ref', 'source', 'reload']);
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const k = key.toLowerCase();
      if (k.startsWith('utm_') || noiseParams.has(k)) {
        keysToDelete.push(key);
      }
    });
    for (const k of keysToDelete) {
      parsed.searchParams.delete(k);
    }
    let res = parsed.toString();
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      res = `${parsed.protocol}//${parsed.host}`;
    }
    return res;
  } catch {
    return rawUrl;
  }
}

/**
 * Normalizes a URL into a canonical key to deduplicate identical destinations.
 */
export function normalizeUrlKey(rawUrl: string): string {
  try {
    const canonical = canonicalizeUrl(rawUrl);
    const parsed = new URL(canonical.includes('://') ? canonical : `http://${canonical}`);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);

    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    } else if (path === '/') {
      path = '';
    }

    const queryStr = parsed.search ? parsed.search.toLowerCase() : '';
    const hashStr = parsed.hash ? parsed.hash.toLowerCase() : '';
    return `${host}${path}${queryStr}${hashStr}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Computes ranked URL suggestions matching a search query from history and bookmarks.
 */
export function computeUrlSuggestions(
  query: string,
  history: HistoryItem[] = [],
  bookmarks: BookmarkItem[] = [],
  defaultSearchEngine: string = 'google',
  openTabs: TabInfo[] = [],
  activeTabId?: string
): UrlSuggestion[] {
  const q = query.trim().toLowerCase();
  const results: UrlSuggestion[] = [];
  const seenKeys = new Set<string>();

  // Explicit Tab Search with % or @tabs
  if (q.startsWith('%') || q.startsWith('@tabs')) {
    let tabQuery = '';
    if (q.startsWith('%')) {
      tabQuery = q.slice(1).trim();
    } else if (q.startsWith('@tabs')) {
      tabQuery = q.slice(5).trim();
    }

    const matched = openTabs.filter((t) => {
      if (!tabQuery) return true;
      const titleLower = (t.title || '').toLowerCase();
      const urlLower = (t.url || '').toLowerCase();
      return titleLower.includes(tabQuery) || urlLower.includes(tabQuery);
    });

    for (const t of matched.slice(0, 8)) {
      const { cleanUrl, cleanDomain } = cleanUrlForMatching(t.url);
      results.push({
        id: `tab-${t.id}`,
        type: 'tab',
        title: t.title || cleanDomain || 'Untitled Tab',
        url: t.url,
        displayUrl: cleanUrl,
        cleanDomain,
        favicon: t.favicon,
        tabId: t.id,
      });
    }

    if (results.length === 0) {
      results.push({
        id: 'no-tab-matches',
        type: 'tab',
        title: `No open tabs matching "${tabQuery}"`,
        url: '',
        displayUrl: '',
        cleanDomain: '',
      });
    }

    return results;
  }

  // If query is empty, show recent bookmarks and history items
  if (!q) {
    // Add bookmarks
    for (const bm of bookmarks.slice(0, 4)) {
      if (!bm.url || bm.url === 'about:blank') continue;
      const canonical = canonicalizeUrl(bm.url);
      const normKey = normalizeUrlKey(canonical);
      if (seenKeys.has(normKey)) continue;
      seenKeys.add(normKey);
      const { cleanUrl, cleanDomain } = cleanUrlForMatching(canonical);
      results.push({
        id: `bm-${bm.url}`,
        type: 'bookmark',
        title: bm.title || cleanDomain,
        url: canonical,
        displayUrl: cleanUrl,
        cleanDomain,
        favicon: bm.favicon,
      });
    }

    // Add recent history
    for (const h of history) {
      if (!h.url || h.url === 'about:blank') continue;
      const canonical = canonicalizeUrl(h.url);
      const normKey = normalizeUrlKey(canonical);
      if (seenKeys.has(normKey)) continue;
      seenKeys.add(normKey);
      const { cleanUrl, cleanDomain } = cleanUrlForMatching(canonical);
      results.push({
        id: `h-${h.id}`,
        type: 'history',
        title: h.title || cleanDomain,
        url: canonical,
        displayUrl: cleanUrl,
        cleanDomain,
        visitedAt: h.visitedAt,
      });
      if (results.length >= 6) break;
    }
    return results.slice(0, 6);
  }

  // Query is not empty: match bookmarks and history
  interface Candidate {
    suggestion: UrlSuggestion;
    score: number;
  }

  const candidates: Candidate[] = [];

  const evaluateItem = (
    url: string,
    title: string,
    type: 'bookmark' | 'history',
    id: string,
    favicon?: string,
    visitedAt?: number
  ) => {
    if (!url || url === 'about:blank') return;
    const canonical = canonicalizeUrl(url);
    const normKey = normalizeUrlKey(canonical);
    if (seenKeys.has(normKey)) return;
    seenKeys.add(normKey);

    const { cleanUrl, cleanDomain } = cleanUrlForMatching(canonical);
    const cleanUrlLower = cleanUrl.toLowerCase();
    const cleanDomainLower = cleanDomain.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const fullUrlLower = canonical.toLowerCase();

    // Check if URL is root domain (e.g. "youtube.com" or "youtube.com/")
    const isRootDomain =
      cleanUrlLower === cleanDomainLower ||
      cleanUrlLower === `${cleanDomainLower}/` ||
      cleanUrlLower === '';

    let score = -1;

    // 1. Domain prefix match (e.g. "youtu" matches "youtube.com")
    if (cleanDomainLower.startsWith(q)) {
      score = 1000 - cleanDomainLower.length;
      if (isRootDomain) {
        score += 400; // Prioritize main root domain (e.g. youtube.com over specific videos)
      }
    } else if (cleanUrlLower.startsWith(q)) {
      score = 800 - cleanUrlLower.length;
      if (isRootDomain) {
        score += 200;
      }
    } else if (fullUrlLower.startsWith(q)) {
      score = 700 - fullUrlLower.length;
    } else if (titleLower.startsWith(q)) {
      score = 600;
    } else if (cleanDomainLower.includes(q)) {
      score = 400;
    } else if (cleanUrlLower.includes(q)) {
      score = 300;
    } else if (titleLower.includes(q)) {
      score = 200;
    }

    if (score > 0) {
      if (type === 'bookmark') score += 50;
      if (visitedAt) {
        const hoursAgo = (Date.now() - visitedAt) / (1000 * 60 * 60);
        if (hoursAgo < 24) score += 30;
      }

      candidates.push({
        suggestion: {
          id: `${type}-${id}`,
          type,
          title: title || cleanDomain,
          url: canonical,
          displayUrl: cleanUrl,
          cleanDomain,
          favicon,
          visitedAt,
        },
        score,
      });
    }
  };

  // Evaluate bookmarks first
  for (const bm of bookmarks) {
    evaluateItem(bm.url, bm.title, 'bookmark', bm.url, bm.favicon);
  }

  // Evaluate history
  for (const h of history) {
    evaluateItem(h.url, h.title, 'history', h.id, undefined, h.visitedAt);
  }

  // Evaluate other open tabs for "Switch to Tab" suggestion
  for (const t of openTabs) {
    if (t.id === activeTabId || !t.url || t.url === 'about:blank') continue;
    const { cleanUrl, cleanDomain } = cleanUrlForMatching(t.url);
    const cleanUrlLower = cleanUrl.toLowerCase();
    const cleanDomainLower = cleanDomain.toLowerCase();
    const titleLower = (t.title || '').toLowerCase();

    let tabScore = 0;
    if (titleLower.startsWith(q) || cleanDomainLower.startsWith(q)) {
      tabScore = 950;
    } else if (titleLower.includes(q) || cleanUrlLower.includes(q)) {
      tabScore = 750;
    }

    if (tabScore > 0) {
      candidates.push({
        suggestion: {
          id: `tab-${t.id}`,
          type: 'tab',
          title: t.title || cleanDomain,
          url: t.url,
          displayUrl: cleanUrl,
          cleanDomain,
          favicon: t.favicon,
          tabId: t.id,
        },
        score: tabScore,
      });
    }
  }

  // If query starts with '!', handle bang exploration or execution
  if (q.startsWith('!')) {
    const bangMatch = parseBangQuery(query);
    if (bangMatch && bangMatch.cleanQuery) {
      results.push({
        id: `bang-${bangMatch.bangDef.bang}`,
        type: 'bang',
        title: `Search ${bangMatch.bangDef.name} for "${bangMatch.cleanQuery}"`,
        url: bangMatch.targetUrl,
        displayUrl: `${bangMatch.bangDef.bang} ${bangMatch.cleanQuery}`,
        cleanDomain: bangMatch.bangDef.homeUrl.replace(/^https?:\/\//, ''),
      });
      // Also include any bookmarks/history that match
      for (const c of candidates.slice(0, 4)) {
        results.push(c.suggestion);
      }
      return results;
    }

    // Exploring bangs (e.g. "!" or "!y" or "!g")
    const matchingBangs = SUPPORTED_BANGS.filter(
      (b) => b.bang.startsWith(q) || b.aliases?.some((a) => a.startsWith(q))
    );
    for (const b of matchingBangs.slice(0, 6)) {
      results.push({
        id: `bang-help-${b.bang}`,
        type: 'bang',
        title: `${b.bang} — Search ${b.name}`,
        url: b.homeUrl,
        displayUrl: `${b.bang} <query>`,
        cleanDomain: b.homeUrl.replace(/^https?:\/\//, ''),
      });
    }
    return results;
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Exactly ONE Top Hit: only the single highest-scoring candidate if it is a strong domain or URL prefix match (score >= 800)
  if (candidates.length > 0 && candidates[0].score >= 800 && candidates[0].suggestion.type !== 'tab') {
    const top = candidates[0];
    const topDomain = top.suggestion.cleanDomain.toLowerCase();
    const topUrl = top.suggestion.displayUrl.toLowerCase();
    if (topDomain.startsWith(q) || topUrl.startsWith(q)) {
      top.suggestion.type = 'top-hit';
    }
  }

  const engines: Record<string, string> = {
    google: 'Google',
    duckduckgo: 'DuckDuckGo',
    brave: 'Brave',
    bing: 'Bing',
  };
  const engineName = engines[defaultSearchEngine] || 'Google';

  const bangMatch = parseBangQuery(query);
  const searchSuggestion: UrlSuggestion = bangMatch
    ? {
        id: 'search-bang',
        type: 'bang',
        title: `Search ${bangMatch.bangDef.name} for "${bangMatch.cleanQuery || '...'}"`,
        url: bangMatch.targetUrl,
        displayUrl: query,
        cleanDomain: bangMatch.bangDef.homeUrl.replace(/^https?:\/\//, ''),
      }
    : {
        id: 'search-fallback',
        type: 'search',
        title: `Search ${engineName} for "${query}"`,
        url: query,
        displayUrl: query,
        cleanDomain: '',
      };

  const hasTopHit = candidates.length > 0 && candidates[0].suggestion.type === 'top-hit';

  if (hasTopHit) {
    results.push(candidates[0].suggestion);
    results.push(searchSuggestion);
    for (const c of candidates.slice(1, 5)) {
      results.push(c.suggestion);
    }
  } else {
    results.push(searchSuggestion);
    for (const c of candidates.slice(0, 5)) {
      results.push(c.suggestion);
    }
  }

  return results;
}

/**
 * Computes an inline autocomplete suffix to suggest in the input if the top suggestion matches the query prefix.
 * E.g. query = "youtu", top suggestion cleanDomain = "youtube.com" -> returns { fullCompletedText: "youtube.com", suffix: "be.com" }
 */
export function computeInlineAutocomplete(
  query: string,
  topSuggestion?: UrlSuggestion
): { fullCompletedText: string; suffix: string } | null {
  if (
    !query ||
    !topSuggestion ||
    topSuggestion.type === 'search' ||
    topSuggestion.type === 'bang' ||
    topSuggestion.type === 'tab'
  )
    return null;

  const qLower = query.toLowerCase();

  // If query starts with http:// or https://, match against full URL
  if (qLower.startsWith('http://') || qLower.startsWith('https://')) {
    const fullLower = topSuggestion.url.toLowerCase();
    if (fullLower.startsWith(qLower) && fullLower.length > qLower.length) {
      const suffix = topSuggestion.url.slice(query.length);
      return {
        fullCompletedText: query + suffix,
        suffix,
      };
    }
    return null;
  }

  // Otherwise match against cleanDomain
  const domainLower = topSuggestion.cleanDomain.toLowerCase();
  if (domainLower.startsWith(qLower) && domainLower.length > qLower.length) {
    const suffix = topSuggestion.cleanDomain.slice(query.length);
    return {
      fullCompletedText: query + suffix,
      suffix,
    };
  }

  // Match against displayUrl
  const cleanUrlLower = topSuggestion.displayUrl.toLowerCase();
  if (cleanUrlLower.startsWith(qLower) && cleanUrlLower.length > qLower.length) {
    const suffix = topSuggestion.displayUrl.slice(query.length);
    return {
      fullCompletedText: query + suffix,
      suffix,
    };
  }

  return null;
}

/**
 * Checks whether the input string looks like a direct URL or domain rather than a general search.
 */
export function isLikelyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^localhost(:\d+)?/i.test(trimmed)) return true;
  if (trimmed.startsWith('%') || trimmed.startsWith('@tabs')) return true;
  if (trimmed.includes(' ') || !trimmed.includes('.')) return false;

  const dotParts = trimmed.split('/');
  const domainPart = dotParts[0];
  return domainPart.includes('.') && !domainPart.endsWith('.');
}

/**
 * Formats live search query completions into UrlSuggestion items.
 */
export function formatSearchSuggestions(
  query: string,
  rawSuggestions: string[]
): UrlSuggestion[] {
  const qLower = query.trim().toLowerCase();
  const results: UrlSuggestion[] = [];

  for (let i = 0; i < rawSuggestions.length; i++) {
    const term = rawSuggestions[i].trim();
    if (!term || term.toLowerCase() === qLower) continue;

    results.push({
      id: `suggest-${i}-${term}`,
      type: 'search',
      title: term,
      url: term,
      displayUrl: term,
      cleanDomain: '',
    });
  }

  return results;
}

/**
 * Merges live search query suggestions into an existing UrlSuggestions list.
 * Preserves 'top-hit', open tabs, and the primary 'Search <Engine> for <query>' fallback.
 */
export function mergeSearchSuggestions(
  currentList: UrlSuggestion[],
  searchSuggestions: UrlSuggestion[]
): UrlSuggestion[] {
  if (searchSuggestions.length === 0) return currentList;

  const topHit = currentList.find((item) => item.type === 'top-hit');
  const searchFallback = currentList.find(
    (item) => item.id === 'search-fallback' || item.id === 'search-bang'
  );
  const otherItems = currentList.filter(
    (item) =>
      item.type !== 'top-hit' &&
      item.id !== 'search-fallback' &&
      item.id !== 'search-bang' &&
      !item.id.startsWith('suggest-')
  );

  const results: UrlSuggestion[] = [];

  if (topHit) {
    results.push(topHit);
    if (searchFallback) results.push(searchFallback);
    results.push(...searchSuggestions.slice(0, 3));
    results.push(...otherItems.slice(0, 3));
  } else {
    if (searchFallback) results.push(searchFallback);
    results.push(...searchSuggestions.slice(0, 5));
    results.push(...otherItems.slice(0, 3));
  }

  return results;
}
