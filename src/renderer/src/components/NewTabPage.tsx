import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Globe,
  Code,
  Terminal,
  BookOpen,
  Compass,
  Layers,
  Star,
  Clock,
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
  Sliders,
  X,
} from 'lucide-react';
import type { BrowserState, WeatherData, HistoryItem } from '@/shared/types';
import type { ThemeMode } from '../App';
import {
  computeUrlSuggestions,
  computeInlineAutocomplete,
  cleanUrlForMatching,
  type UrlSuggestion,
} from '../utils/autocomplete';

interface NewTabPageProps {
  state: BrowserState;
  theme: ThemeMode;
}

const DEFAULT_SHORTCUTS = [
  {
    title: 'GitHub',
    url: 'https://github.com',
    icon: Code,
    bg: 'bg-zinc-800 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-200',
  },
  {
    title: 'Hacker News',
    url: 'https://news.ycombinator.com',
    icon: Terminal,
    bg: 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  },
  {
    title: 'Wikipedia',
    url: 'https://wikipedia.org',
    icon: BookOpen,
    bg: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  },
  {
    title: 'Reddit',
    url: 'https://reddit.com',
    icon: Globe,
    bg: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  },
  {
    title: 'DuckDuckGo',
    url: 'https://duckduckgo.com',
    icon: Compass,
    bg: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
];

export const NewTabPage: React.FC<NewTabPageProps> = ({ state, theme }) => {
  const [query, setQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const customizerRef = useRef<HTMLDivElement>(null);

  // Autocomplete state
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<UrlSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const skipNextAutocompleteRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const safeSettings = state.settings || ({} as any);

  const showClock = safeSettings.newTabShowClock !== false;
  const clockFormat = safeSettings.newTabClockFormat || '12h';
  const showWeather = safeSettings.newTabShowWeather !== false;
  const showQuickLinks = safeSettings.newTabShowQuickLinks !== false;

  // Load history for autocomplete
  useEffect(() => {
    if (window.browserApi?.getHistory) {
      window.browserApi.getHistory().then((items) => setHistoryList(items || [])).catch(() => {});
    }
  }, []);

  // Live Clock Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather fetch via main process IPC
  const fetchWeather = async () => {
    if (!showWeather) return;
    setWeatherLoading(true);
    try {
      if (window.browserApi?.getWeather) {
        const data = await window.browserApi.getWeather();
        if (data) {
          setWeather(data);
        }
      }
    } catch (err) {
      console.warn('Weather fetch failed:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (showWeather) {
      fetchWeather();
    }
  }, [showWeather]);

  // Close customizer dropdown on outside click
  useEffect(() => {
    if (!showCustomizer) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (customizerRef.current && !customizerRef.current.contains(e.target as Node)) {
        setShowCustomizer(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomizer]);

  const handleSearchFocus = () => {
    if (query.trim()) {
      const computed = computeUrlSuggestions(
        query,
        historyList,
        state.bookmarks || [],
        safeSettings.defaultSearchEngine || 'google'
      );
      setSuggestions(computed);
      setSelectedIndex(-1);
      setIsDropdownOpen(computed.length > 0);
    }
  };

  const handleSearchBlur = (e: React.FocusEvent) => {
    if (searchDropdownRef.current && searchDropdownRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDropdownOpen(false);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setQuery(rawVal);

    if (!rawVal.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
      return;
    }

    const computed = computeUrlSuggestions(
      rawVal,
      historyList,
      state.bookmarks || [],
      safeSettings.defaultSearchEngine || 'google'
    );
    setSuggestions(computed);
    setSelectedIndex(computed.length > 0 ? 0 : -1);
    setIsDropdownOpen(computed.length > 0);

    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }

    if (computed.length > 0) {
      const top = computed[0];
      const inline = computeInlineAutocomplete(rawVal, top);
      if (inline && searchInputRef.current) {
        setQuery(inline.fullCompletedText);
        const typedLen = rawVal.length;
        const totalLen = inline.fullCompletedText.length;
        requestAnimationFrame(() => {
          searchInputRef.current?.setSelectionRange(typedLen, totalLen);
        });
      }
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      skipNextAutocompleteRef.current = true;
      return;
    }

    if (e.key === 'Escape') {
      if (isDropdownOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsDropdownOpen(false);
        return;
      }
    }

    if (e.key === 'Tab' || e.key === 'ArrowRight') {
      if (
        searchInputRef.current &&
        searchInputRef.current.selectionStart !== null &&
        searchInputRef.current.selectionEnd !== null
      ) {
        if (
          searchInputRef.current.selectionStart < searchInputRef.current.selectionEnd &&
          searchInputRef.current.selectionEnd === query.length
        ) {
          e.preventDefault();
          searchInputRef.current.setSelectionRange(query.length, query.length);
          return;
        }
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen && suggestions.length > 0) {
        setIsDropdownOpen(true);
        setSelectedIndex(0);
      } else if (suggestions.length > 0) {
        const nextIdx = (selectedIndex + 1) % suggestions.length;
        setSelectedIndex(nextIdx);
        const item = suggestions[nextIdx];
        if (item) {
          skipNextAutocompleteRef.current = true;
          setQuery(item.type === 'search' ? item.url : item.displayUrl);
        }
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDropdownOpen && suggestions.length > 0) {
        const prevIdx = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        setSelectedIndex(prevIdx);
        const item = suggestions[prevIdx];
        if (item) {
          skipNextAutocompleteRef.current = true;
          setQuery(item.type === 'search' ? item.url : item.displayUrl);
        }
      }
      return;
    }
  };

  const handleSelectSuggestion = (suggestion: UrlSuggestion) => {
    if (!activeTab) return;
    setIsDropdownOpen(false);
    window.browserApi.navigateTab(activeTab.id, suggestion.url);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab) return;

    let targetUrl = query.trim();

    if (isDropdownOpen && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      const selected = suggestions[selectedIndex];
      targetUrl = selected.url;
    } else if (isDropdownOpen && suggestions.length > 0) {
      const top = suggestions[0];
      if (top.type !== 'search') {
        const { cleanUrl, cleanDomain } = cleanUrlForMatching(top.url);
        const inputLower = query.toLowerCase();
        if (
          inputLower === cleanDomain.toLowerCase() ||
          inputLower === cleanUrl.toLowerCase() ||
          top.url.toLowerCase().startsWith(inputLower)
        ) {
          targetUrl = top.url;
        }
      }
    }

    if (!targetUrl) return;

    setIsDropdownOpen(false);
    window.browserApi.navigateTab(activeTab.id, targetUrl);
  };

  const handleShortcutClick = (url: string) => {
    if (!activeTab) return;
    window.browserApi.navigateTab(activeTab.id, url);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatClockTime = () => {
    if (clockFormat === '24h') {
      return currentTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    return currentTime.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatClockDate = () => {
    return currentTime.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const getWeatherIcon = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes('thunder') || d.includes('lightning') || d.includes('storm')) {
      return <CloudLightning className="w-4 h-4 text-amber-400" />;
    }
    if (d.includes('snow') || d.includes('ice') || d.includes('blizzard') || d.includes('sleet')) {
      return <Snowflake className="w-4 h-4 text-sky-300" />;
    }
    if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) {
      return <CloudRain className="w-4 h-4 text-blue-400" />;
    }
    if (d.includes('fog') || d.includes('mist') || d.includes('haze')) {
      return <CloudFog className="w-4 h-4 text-zinc-400" />;
    }
    if (d.includes('cloud') || d.includes('overcast')) {
      return <Cloud className="w-4 h-4 text-slate-400" />;
    }
    if (d.includes('clear') || d.includes('sunny')) {
      return <Sun className="w-4 h-4 text-amber-500" />;
    }
    return <CloudSun className="w-4 h-4 text-amber-400" />;
  };

  // Combine user bookmarks with default shortcuts
  const userBookmarks = state.bookmarks || [];
  const hasUserBookmarks = userBookmarks.length > 0;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-6 select-none relative overflow-y-auto no-scrollbar transition-colors duration-150"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* Top Header Widgets: Weather & Customizer */}
      <div className="absolute top-4 right-6 flex items-center space-x-2 z-20">
        {showWeather && (
          <div
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs shadow-xs transition-all select-none backdrop-blur-xs animate-in fade-in duration-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)',
            }}
            title={weather ? `${weather.desc} in ${weather.area}` : 'Local Weather'}
          >
            {weatherLoading && !weather ? (
              <div className="flex items-center space-x-1.5 text-[var(--text-muted)] animate-pulse">
                <CloudSun className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px]">Loading...</span>
              </div>
            ) : weather ? (
              <>
                {getWeatherIcon(weather.desc)}
                <span className="font-medium font-mono">{weather.tempC}°C</span>
                {weather.area && (
                  <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline truncate max-w-[120px]">
                    {weather.area}
                  </span>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={fetchWeather}
                className="flex items-center space-x-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <CloudSun className="w-3.5 h-3.5 opacity-60" />
                <span className="text-[11px]">Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Page Customizer Toggle */}
        <div className="relative" ref={customizerRef}>
          <button
            type="button"
            onClick={() => setShowCustomizer((prev) => !prev)}
            className="p-2 rounded-xl border transition-all cursor-pointer hover:border-[var(--border-selected)]"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-muted)',
            }}
            title="Customize New Tab Widgets"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Floating Customizer Dropdown Popover */}
          {showCustomizer && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl p-3.5 space-y-3 z-30 animate-scale-up"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span className="text-xs font-semibold">Customize Widgets</span>
                </div>
                <button
                  onClick={() => setShowCustomizer(false)}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Clock Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px]">Clock & Date</span>
                  <input
                    type="checkbox"
                    checked={showClock}
                    onChange={(e) =>
                      window.browserApi.updateSettings({ newTabShowClock: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)]"
                  />
                </label>

                {/* Clock Format Toggle */}
                {showClock && (
                  <label className="flex items-center justify-between cursor-pointer pl-2">
                    <span className="text-[10px] text-[var(--text-muted)]">24-Hour Format</span>
                    <input
                      type="checkbox"
                      checked={clockFormat === '24h'}
                      onChange={(e) =>
                        window.browserApi.updateSettings({
                          newTabClockFormat: e.target.checked ? '24h' : '12h',
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)]"
                    />
                  </label>
                )}

                {/* Weather Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px]">Weather Widget</span>
                  <input
                    type="checkbox"
                    checked={showWeather}
                    onChange={(e) =>
                      window.browserApi.updateSettings({ newTabShowWeather: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)]"
                  />
                </label>

                {/* Quick Links Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px]">Favorites & Quick Links</span>
                  <input
                    type="checkbox"
                    checked={showQuickLinks}
                    onChange={(e) =>
                      window.browserApi.updateSettings({ newTabShowQuickLinks: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--accent-primary)]"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="w-full max-w-lg flex flex-col items-center space-y-6 z-10 -mt-4">
        {/* Optional Live Clock & Date */}
        {showClock && (
          <div className="flex flex-col items-center space-y-1 select-none animate-in fade-in duration-200">
            <div className="text-4xl sm:text-5xl font-semibold tracking-tight font-mono text-[var(--text-main)] drop-shadow-xs">
              {formatClockTime()}
            </div>
            <div className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
              {formatClockDate()}
            </div>
          </div>
        )}

        {/* Centered Weather Badge */}
        {showWeather && (
          <div
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-xs shadow-xs transition-all select-none backdrop-blur-xs animate-in fade-in duration-200 -mt-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
            }}
          >
            {weatherLoading && !weather ? (
              <div className="flex items-center space-x-2 text-[var(--text-muted)] animate-pulse">
                <CloudSun className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px]">Loading local weather...</span>
              </div>
            ) : weather ? (
              <div className="flex items-center space-x-2 text-[var(--text-main)]">
                {getWeatherIcon(weather.desc)}
                <span className="font-semibold font-mono">{weather.tempC}°C</span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--text-muted)] capitalize">{weather.desc}</span>
                {weather.area && (
                  <>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-[var(--text-muted)]">{weather.area}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                <CloudSun className="w-3.5 h-3.5 opacity-50" />
                <span className="text-[11px]">Weather unavailable</span>
                <button
                  type="button"
                  onClick={fetchWeather}
                  className="text-[11px] underline hover:text-[var(--text-main)] cursor-pointer ml-1"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Warm greeting & Brand Icon */}
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm mb-1"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            L
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-main)]">
            {getGreeting()}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Where would you like to go?
          </p>
        </div>

        {/* Center Search Input */}
        <form onSubmit={handleSearch} className="w-full relative">
          <div className="absolute left-3.5 top-3 flex items-center pointer-events-none text-[var(--text-muted)]">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="Search the web or enter an address..."
            autoFocus
            className="w-full h-11 pl-10 pr-4 rounded-xl text-xs sm:text-sm transition-all border focus:outline-none shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: isDropdownOpen ? 'var(--border-selected)' : 'var(--border-subtle)',
              color: 'var(--text-main)',
              boxShadow: isDropdownOpen ? '0 0 0 1px var(--border-selected)' : 'none',
            }}
          />

          {/* Autocomplete Suggestions Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div
              ref={searchDropdownRef}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute left-0 right-0 top-full mt-2 rounded-xl border shadow-2xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-1 duration-150 py-1"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-card)',
                boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.35), 0 6px 16px -2px rgba(0, 0, 0, 0.2)',
              }}
            >
              {suggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-black/10 dark:bg-white/10 text-[var(--text-main)]'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                      <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md text-[var(--text-muted)]">
                        {item.type === 'bookmark' ? (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                        ) : item.type === 'search' ? (
                          <Search className="w-4 h-4 text-[var(--accent-primary)]" />
                        ) : item.type === 'top-hit' ? (
                          <Globe className="w-4 h-4 text-[var(--accent-primary)]" />
                        ) : (
                          <Clock className="w-4 h-4 opacity-70" />
                        )}
                      </div>

                      <div className="flex items-baseline space-x-2 min-w-0 flex-1 truncate">
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {item.title}
                        </span>
                        {item.type !== 'search' && (
                          <span className="text-xs font-mono text-[var(--text-muted)] truncate opacity-80">
                            {item.displayUrl}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1.5">
                      {item.type === 'top-hit' && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                          }}
                        >
                          Top Hit
                        </span>
                      )}
                      {item.type === 'bookmark' && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20">
                          Bookmark
                        </span>
                      )}
                      {item.type === 'history' && (
                        <span className="text-[9px] text-[var(--text-muted)] opacity-70">
                          History
                        </span>
                      )}
                      {item.type === 'search' && (
                        <span className="text-[9px] text-[var(--text-muted)] font-mono">
                          ↵ Search
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div
                className="px-3.5 py-1.5 border-t text-[10px] text-[var(--text-muted)] flex items-center justify-between opacity-70 select-none"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span>↑↓ Navigate • ↵ Open • Tab Complete</span>
                <span>Esc Dismiss</span>
              </div>
            </div>
          )}
        </form>

        {/* Bookmarks / Quick Links Speed Dial */}
        {showQuickLinks && (
          <div className="w-full space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--text-muted)] flex items-center space-x-1">
                {hasUserBookmarks ? (
                  <>
                    <Star className="w-3 h-3 inline mr-1 text-amber-400 fill-amber-400" />
                    Favorites
                  </>
                ) : (
                  'Quick Links'
                )}
              </span>
              {hasUserBookmarks && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {userBookmarks.length} saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-3 w-full">
              {hasUserBookmarks
                ? userBookmarks.slice(0, 10).map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => handleShortcutClick(bm.url)}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 group hover:border-[var(--border-selected)]/50 hover:-translate-y-0.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-card)',
                      }}
                      title={`${bm.title}\n${bm.url}`}
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 mb-2 transition-transform group-hover:scale-105 flex items-center justify-center w-8 h-8">
                        {bm.favicon ? (
                          <img src={bm.favicon} alt="" className="w-4 h-4 rounded-xs" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-[11px] font-medium truncate w-full text-center text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                        {bm.title || bm.url}
                      </span>
                    </button>
                  ))
                : DEFAULT_SHORTCUTS.map((shortcut) => {
                    const Icon = shortcut.icon;
                    return (
                      <button
                        key={shortcut.url}
                        onClick={() => handleShortcutClick(shortcut.url)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 group hover:border-[var(--border-selected)]/50 hover:-translate-y-0.5 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-card)',
                        }}
                      >
                        <div
                          className={`p-2.5 rounded-lg ${shortcut.bg} mb-2 transition-transform group-hover:scale-105`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-medium truncate w-full text-center text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                          {shortcut.title}
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        )}

        {/* Subtle, humane feature hint */}
        <div
          className="w-full px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-card)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="flex items-center space-x-2 truncate mr-2">
            <Layers
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: 'var(--accent-primary)' }}
            />
            <span className="truncate text-[11px]">
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded font-mono font-medium border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Ctrl+Tab
              </kbd>{' '}
              to switch tabs, or{' '}
              <kbd className="px-1.5 py-0.5 rounded font-mono font-medium border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[var(--text-main)]">
                Ctrl+D
              </kbd>{' '}
              to favorite
            </span>
          </div>
          <button
            onClick={() => window.browserApi.openSwitcher()}
            className="text-[11px] font-medium hover:underline flex-shrink-0 cursor-pointer"
            style={{ color: 'var(--accent-primary)' }}
          >
            Open switcher
          </button>
        </div>
      </div>
    </div>
  );
};
