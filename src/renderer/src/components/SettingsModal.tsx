import React, { useState } from 'react';
import {
  X,
  Palette,
  Layers,
  Search,
  Info,
  Sun,
  Moon,
  Check,
  Globe,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { BrowserSettings } from '../../shared/types';
import type { ThemeMode } from '../App';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BrowserSettings;
  theme: ThemeMode;
  onUpdateSettings: (settings: Partial<BrowserSettings>) => void;
}

type TabType = 'appearance' | 'switcher' | 'search' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  theme,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl transition-all duration-200 select-none ${
        isDark ? 'bg-black/75' : 'bg-slate-900/35'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col md:flex-row h-[520px] animate-scale-up ${
          isDark
            ? 'bg-[#0f111d]/95 border-purple-500/25 text-slate-100 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(168,85,247,0.18)]'
            : 'bg-white/95 border-indigo-100 text-slate-800 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar Navigation */}
        <div
          className={`w-full md:w-56 p-4 border-b md:border-b-0 md:border-r flex flex-col justify-between ${
            isDark ? 'border-purple-500/15 bg-black/25' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <div className="space-y-1">
            <div className="px-3 py-2 flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-400" />
              <span className="text-xs font-black tracking-widest bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                LARP SETTINGS
              </span>
            </div>

            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'appearance'
                  ? isDark
                    ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Appearance & Theme</span>
            </button>

            <button
              onClick={() => setActiveTab('switcher')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'switcher'
                  ? isDark
                    ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Tab Switcher HUD</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'search'
                  ? isDark
                    ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Search Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'about'
                  ? isDark
                    ? 'bg-purple-900/40 text-purple-200 border border-purple-500/30'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>About Larp</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-500 font-mono px-3 py-1">
            Shortcut: <kbd className="font-semibold text-purple-400">Ctrl+,</kbd>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {/* Top Bar inside modal */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isDark ? 'border-purple-500/15' : 'border-slate-200'
          }`}>
            <h3 className="text-sm font-bold capitalize flex items-center space-x-2">
              <span>{activeTab === 'appearance' ? 'Appearance & Web Theming' : activeTab}</span>
            </h3>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section Bodies */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* 1. Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold block mb-2 text-slate-300">
                    Application Theme
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Dark Option */}
                    <button
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                      className={`p-3 rounded-2xl border flex items-center space-x-3 transition-all ${
                        isDark
                          ? 'border-purple-500 bg-[#171a2b] shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-purple-900/40 text-purple-300">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white">Obsidian Neon</div>
                        <div className="text-[10px] text-slate-400">Vibrant dark mode</div>
                      </div>
                      {isDark && <Check className="w-4 h-4 text-purple-400 ml-auto" />}
                    </button>

                    {/* Light Option */}
                    <button
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                      className={`p-3 rounded-2xl border flex items-center space-x-3 transition-all ${
                        !isDark
                          ? 'border-indigo-500 bg-indigo-50/80 shadow-md ring-1 ring-indigo-400'
                          : 'border-white/[0.08] bg-[#121422] hover:bg-[#181b2c]'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-amber-400/20 text-amber-500">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className={`text-xs font-bold ${!isDark ? 'text-slate-900' : 'text-slate-200'}`}>
                          Opal Frost
                        </div>
                        <div className="text-[10px] text-slate-400">Crisp light mode</div>
                      </div>
                      {!isDark && <Check className="w-4 h-4 text-indigo-600 ml-auto" />}
                    </button>
                  </div>
                </div>

                {/* Force Web Page Dark Mode Option */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-[#151829] border-purple-500/20' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between space-x-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold">Follow Dark Theme on Webpages</span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Instructs websites (like Google, GitHub, YouTube, Wikipedia) to automatically display their dark mode, matching your Larp theme.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={settings.forcePageDarkMode}
                        onChange={(e) => onUpdateSettings({ forcePageDarkMode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Switcher HUD Tab */}
            {activeTab === 'switcher' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-[#151829] border-purple-500/20' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold">Fast Live Snapshot Cards</span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Captures 360px downscaled snapshots of tabs so cycling with <kbd className="font-mono text-purple-400">Ctrl+Shift+Tab</kbd> shows real-time previews with zero lag.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-[#151829] border-purple-500/20' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold">Auto-Hibernate Inactive Tabs</div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Frees up RAM when tabs have been idle for more than 30 minutes.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoHibernateTabs}
                      onChange={(e) => onUpdateSettings({ autoHibernateTabs: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* 3. Search Engine Tab */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <label className="text-xs font-semibold block text-slate-300">
                  Default Omnibar Search Engine
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy-focused search engine' },
                    { id: 'google', name: 'Google', desc: 'Standard search results' },
                    { id: 'brave', name: 'Brave Search', desc: 'Independent search index' },
                    { id: 'bing', name: 'Microsoft Bing', desc: 'Bing search engine' },
                  ].map((engine) => (
                    <button
                      key={engine.id}
                      onClick={() => onUpdateSettings({ defaultSearchEngine: engine.id as any })}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        settings.defaultSearchEngine === engine.id
                          ? isDark
                            ? 'border-purple-500 bg-[#171a2b] shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                            : 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                          : isDark
                          ? 'border-white/[0.06] bg-[#121422] hover:bg-[#17192a]'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Globe className="w-4 h-4 text-purple-400" />
                        <div className="text-left">
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {engine.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{engine.desc}</div>
                        </div>
                      </div>
                      {settings.defaultSearchEngine === engine.id && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 to-cyan-500/10 border border-purple-500/20">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Larp Browser</h4>
                    <p className="text-[11px] text-purple-300">Version 1.0.0 (Chromium 130+)</p>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2 text-xs leading-relaxed ${
                  isDark ? 'border-white/[0.08] bg-[#121422] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                  <p>
                    A custom minimalist web browser that replaces standard top tab bars with a keyboard-driven visual Alt-Tab switcher HUD.
                  </p>
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
                    Built with Electron WebContentsView, React 19, and Tailwind CSS.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className={`p-4 border-t flex items-center justify-end ${
            isDark ? 'border-purple-500/15 bg-black/20' : 'border-slate-200 bg-slate-50'
          }`}>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-md hover:brightness-110 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
