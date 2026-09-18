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
import type { BrowserState } from '@/shared/types';
import type { ThemeMode } from '../App';

interface NewTabPageProps {
  state: BrowserState;
  theme: ThemeMode;
}

interface WeatherInfo {
  tempC: string;
  desc: string;
  area: string;
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
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const customizerRef = useRef<HTMLDivElement>(null);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const safeSettings = state.settings || ({} as any);

  const showClock = safeSettings.newTabShowClock !== false;
  const clockFormat = safeSettings.newTabClockFormat || '12h';
  const showWeather = safeSettings.newTabShowWeather !== false;
  const showQuickLinks = safeSettings.newTabShowQuickLinks !== false;

  // Live Clock Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather fetch with session storage cache (20 min)
  useEffect(() => {
    if (!showWeather) return;

    const CACHE_KEY = 'larp_weather_data';
    const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          setWeather(parsed.data);
          return;
        }
      }
    } catch {
      // Ignore cache read error
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    fetch('https://wttr.in/?format=j1', { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        if (!res.ok) throw new Error('Weather request failed');
        return res.json();
      })
      .then((data) => {
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0]?.areaName?.[0]?.value || '';
        if (current) {
          const wInfo: WeatherInfo = {
            tempC: current.temp_C || '',
            desc: current.weatherDesc?.[0]?.value || 'Clear',
            area: area,
          };
          setWeather(wInfo);
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ timestamp: Date.now(), data: wInfo })
            );
          } catch {
            // Ignore cache write error
          }
        }
      })
      .catch(() => {
        // Silently ignore if offline or blocked
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab || !query.trim()) return;
    window.browserApi.navigateTab(activeTab.id, query.trim());
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
        {showWeather && weather && (
          <div
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs shadow-xs transition-all select-none backdrop-blur-xs animate-in fade-in duration-200"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)',
            }}
            title={`${weather.desc} in ${weather.area}`}
          >
            {getWeatherIcon(weather.desc)}
            <span className="font-medium font-mono">{weather.tempC}°C</span>
            {weather.area && (
              <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline truncate max-w-[120px]">
                {weather.area}
              </span>
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
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web or enter an address..."
            autoFocus
            className="w-full h-11 pl-10 pr-4 rounded-xl text-xs sm:text-sm transition-all border focus:outline-none shadow-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-selected)';
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--border-selected)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
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
