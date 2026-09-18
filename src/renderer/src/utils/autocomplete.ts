import type { BookmarkItem, HistoryItem } from '@/shared/types';

export interface UrlSuggestion {
  id: string;
  type: 'top-hit' | 'history' | 'bookmark' | 'search';
  title: string;
  url: string;
  displayUrl: string;
  cleanDomain: string;
  favicon?: string;
  visitedAt?: number;
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
 * Computes ranked URL suggestions matching a search query from history and bookmarks.
 */
export function computeUrlSuggestions(
  query: string,
  history: HistoryItem[] = [],
  bookmarks: BookmarkItem[] = [],
  defaultSearchEngine: string = 'google'
): UrlSuggestion[] {
  const q = query.trim().toLowerCase();
  const results: UrlSuggestion[] = [];
  const seenUrls = new Set<string>();

  // If query is empty, show recent bookmarks and history items
  if (!q) {
    // Add bookmarks
    for (const bm of bookmarks.slice(0, 4)) {
      if (!bm.url || bm.url === 'about:blank' || seenUrls.has(bm.url)) continue;
      seenUrls.add(bm.url);
      const { cleanUrl, cleanDomain } = cleanUrlForMatching(bm.url);
      results.push({
        id: `bm-${bm.url}`,
        type: 'bookmark',
        title: bm.title || cleanDomain,
        url: bm.url,
        displayUrl: cleanUrl,
        cleanDomain,
        favicon: bm.favicon,
      });
    }

    // Add recent history
    for (const h of history.slice(0, 4)) {
      if (!h.url || h.url === 'about:blank' || seenUrls.has(h.url)) continue;
      seenUrls.add(h.url);
      const { cleanUrl, cleanDomain } = cleanUrlForMatching(h.url);
      results.push({
        id: `h-${h.id}`,
        type: 'history',
        title: h.title || cleanDomain,
        url: h.url,
        displayUrl: cleanUrl,
        cleanDomain,
        visitedAt: h.visitedAt,
      });
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
    if (!url || url === 'about:blank' || seenUrls.has(url)) return;
    seenUrls.add(url);

    const { cleanUrl, cleanDomain } = cleanUrlForMatching(url);
    const cleanUrlLower = cleanUrl.toLowerCase();
    const cleanDomainLower = cleanDomain.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const fullUrlLower = url.toLowerCase();

    let score = -1;
    let isTopHit = false;

    // 1. Domain prefix match (e.g. "youtu" matches "youtube.com")
    if (cleanDomainLower.startsWith(q)) {
      score = 1000 - cleanDomainLower.length;
      isTopHit = true;
    } else if (cleanUrlLower.startsWith(q)) {
      score = 800 - cleanUrlLower.length;
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
          type: isTopHit ? 'top-hit' : type,
          title: title || cleanDomain,
          url,
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

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  const engines: Record<string, string> = {
    google: 'Google',
    duckduckgo: 'DuckDuckGo',
    brave: 'Brave',
    bing: 'Bing',
  };
  const engineName = engines[defaultSearchEngine] || 'Google';

  const searchSuggestion: UrlSuggestion = {
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
  if (!query || !topSuggestion || topSuggestion.type === 'search') return null;

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
