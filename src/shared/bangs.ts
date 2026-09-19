export interface BangDefinition {
  bang: string;
  name: string;
  aliases?: string[];
  homeUrl: string;
  searchUrl: (query: string) => string;
}

export const SUPPORTED_BANGS: BangDefinition[] = [
  {
    bang: '!g',
    name: 'Google',
    aliases: ['!google'],
    homeUrl: 'https://www.google.com',
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    bang: '!yt',
    name: 'YouTube',
    aliases: ['!youtube', '!y'],
    homeUrl: 'https://www.youtube.com',
    searchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  },
  {
    bang: '!gh',
    name: 'GitHub',
    aliases: ['!github'],
    homeUrl: 'https://github.com',
    searchUrl: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    bang: '!w',
    name: 'Wikipedia',
    aliases: ['!wiki', '!wikipedia'],
    homeUrl: 'https://www.wikipedia.org',
    searchUrl: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  },
  {
    bang: '!ddg',
    name: 'DuckDuckGo',
    aliases: ['!duckduckgo', '!d'],
    homeUrl: 'https://duckduckgo.com',
    searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
  {
    bang: '!b',
    name: 'Brave Search',
    aliases: ['!brave'],
    homeUrl: 'https://search.brave.com',
    searchUrl: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    bang: '!r',
    name: 'Reddit',
    aliases: ['!reddit'],
    homeUrl: 'https://www.reddit.com',
    searchUrl: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
  },
  {
    bang: '!a',
    name: 'Amazon',
    aliases: ['!amazon'],
    homeUrl: 'https://www.amazon.com',
    searchUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  },
  {
    bang: '!m',
    name: 'Google Maps',
    aliases: ['!maps', '!map'],
    homeUrl: 'https://www.google.com/maps',
    searchUrl: (q) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
  },
  {
    bang: '!npm',
    name: 'npm',
    aliases: ['!packages'],
    homeUrl: 'https://www.npmjs.com',
    searchUrl: (q) => `https://www.npmjs.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    bang: '!so',
    name: 'Stack Overflow',
    aliases: ['!stackoverflow'],
    homeUrl: 'https://stackoverflow.com',
    searchUrl: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
  },
];

/**
 * Parses an input string for a bang (e.g. "!yt music" or "music !yt").
 * Returns the matched bang, remaining search query, and computed target URL.
 */
export function parseBangQuery(input: string): {
  bangDef: BangDefinition;
  cleanQuery: string;
  targetUrl: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return null;

  const findBang = (token: string): BangDefinition | undefined => {
    const t = token.toLowerCase();
    return SUPPORTED_BANGS.find(
      (b) => b.bang.toLowerCase() === t || b.aliases?.some((a) => a.toLowerCase() === t)
    );
  };

  const firstToken = tokens[0];
  const lastToken = tokens[tokens.length - 1];

  let matchedBang: BangDefinition | undefined;
  let remainingQuery = '';

  if (findBang(firstToken)) {
    matchedBang = findBang(firstToken);
    remainingQuery = tokens.slice(1).join(' ').trim();
  } else if (tokens.length > 1 && findBang(lastToken)) {
    matchedBang = findBang(lastToken);
    remainingQuery = tokens.slice(0, tokens.length - 1).join(' ').trim();
  }

  if (!matchedBang) return null;

  const targetUrl = remainingQuery ? matchedBang.searchUrl(remainingQuery) : matchedBang.homeUrl;

  return {
    bangDef: matchedBang,
    cleanQuery: remainingQuery,
    targetUrl,
  };
}
