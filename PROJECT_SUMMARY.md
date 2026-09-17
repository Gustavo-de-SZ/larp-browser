# Larp Browser — Architectural & Technical Summary

## 1. Product Identity & Philosophy

**Larp Browser** is a high-performance, minimalist desktop web browser built with **Electron 41 (`WebContentsView`)**, **React 19**, and **Tailwind CSS**.

### Core Tenets
- **Zero Horizontal Tab Clutter**: Traditional browsers consume 40–80px of vertical height displaying 20+ truncated horizontal tabs. Larp replaces this entirely with a sleek 44px glassmorphic TopBar and an **Alt-Tab / Ctrl-Shift-Tab MRU switcher HUD** with live snapshot previews.
- **Fast, Keyboard-Centric Navigation**: Every core operation (switching tabs, jumping to tab by index, opening, closing, duplicating, bookmarking, and reloading) is mapped to customizable keyboard shortcuts.
- **Zero-Latency Optimistic UI**: UI interactions (palette changes, setting toggles, bookmark toggling) update React state instantaneously (0ms) while synchronizing with Electron's main process in the background.
- **Personality & Aesthetics**: Features curated palettes (Graphite, Midnight, Warm Charcoal, Forest Sage, Pitch Black, Paper, Warm Sand, Cool Slate, Matcha Garden) with custom accent color overrides, subtle border luminance matching, and smart dark mode injection for web pages.
- **Privacy & Security First**: Sandboxed renderers, context-isolated IPC preloads, restrictive permission handlers blocking dangerous OS peripherals (USB, Bluetooth, HID, MIDI), and strictly vetted URL protocols.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  (src/main/index.ts, tab-manager.ts, shortcuts.ts, ipc.ts)  │
├─────────────────────────────────────────────────────────────┤
│  BrowserWindow (Frameless, Custom Drag/Window Controls)     │
│  ├─ WebContents (Shell UI: React 19 + Tailwind CSS)         │
│  │   └─ Preload Script (src/preload/index.ts via ContextBridge)
│  │
│  └─ WebContentsView (Active Web Page View)                  │
│      ├─ Attached dynamically below TopBar (44px)            │
│      ├─ Detached when Switcher HUD or Modals are open       │
│      └─ Sandboxed, nodeIntegration: false, contextIsolation │
└─────────────────────────────────────────────────────────────┘
```

### Why `WebContentsView` instead of `webview` or `BrowserView`?
- `webview` tags are deprecated in Electron, have known memory leaks, and suffer from high overhead.
- `BrowserView` is superseded in modern Electron.
- `WebContentsView` is the modern, official Electron 30+ architecture that integrates directly with Chromium's Views framework, allowing full hardware GPU acceleration, flawless window resizing, and clean lifecycle management.

---

## 3. Directory Structure & File Responsibilities

```
larp-browser/
├── package.json                   # Project metadata, scripts, Electron & React dependencies
├── electron-builder.yml           # Packaging config for Linux (.pacman, .AppImage, .deb)
├── PROJECT_SUMMARY.md             # This persistent project architecture & documentation summary
├── README.md                      # Public README
│
├── src/
│   ├── main/                      # Electron Main Process (Node.js runtime)
│   │   ├── index.ts               # App lifecycle, window creation, security permission handlers
│   │   ├── tab-manager.ts         # Tab state, WebContentsView lifecycle, bookmarks & settings persistence
│   │   ├── shortcuts.ts           # Global before-input-event shortcut dispatcher
│   │   └── ipc-handlers.ts        # IPC invocation handlers (browser:*, window:*)
│   │
│   ├── preload/                   # Preload Context Isolation Bridge
│   │   └── index.ts               # Exposes window.browserApi safely via contextBridge
│   │
│   ├── shared/                    # Code & Types shared across Main and Renderer
│   │   └── types.ts               # BrowserState, BrowserSettings, TabInfo, BookmarkItem, IpcRendererApi
│   │
│   └── renderer/                  # React 19 Frontend Shell UI (Vite + Tailwind CSS)
│       ├── index.html             # Shell HTML document
│       └── src/
│           ├── main.tsx           # React entrypoint
│           ├── App.tsx            # Top-level state coordinator, theme listener, modal coordinator
│           ├── index.css          # Tailwind directives, CSS variables, custom scrollbars
│           ├── components/
│           │   ├── TopBar.tsx           # 44px omnibar, navigation, tab counter, window controls
│           │   ├── TabSwitcher.tsx      # Alt-Tab / Ctrl-Shift-Tab MRU switcher HUD with previews
│           │   ├── NewTabPage.tsx       # Minimalist new tab page with search & favorites
│           │   ├── SettingsModal.tsx    # Multi-tab settings (Appearance, Switcher, Shortcuts, Bookmarks)
│           │   └── KeyboardShortcuts.tsx# Keyboard shortcuts cheatsheet modal
│           └── theme/
│               └── palettes.ts          # Curated color palettes & CSS variable injection engine
│
└── release/                       # Built distribution packages (.pacman, .AppImage)
```

---

## 4. State Management & Data Flow

### 1. The Single Source of Truth: `TabManager`
- Located in `src/main/tab-manager.ts`.
- Maintains:
  - `tabs: Map<string, { info: TabInfo; view: WebContentsView }>`
  - `activeTabId: string | null`
  - `mruTabIds: string[]` (Most Recently Used stack for tab switcher)
  - `bookmarks: BookmarkItem[]` (persisted to `userData/larp-bookmarks.json`)
  - `settings: BrowserSettings` (persisted to `userData/larp-settings.json`)
- Broadcasts state updates to the shell window via `mainWindow.webContents.send('browser:state-update', state)`.

### 2. Optimistic UI Updates in Renderer
- In `src/renderer/src/App.tsx`, user actions (toggling dark mode, picking a palette, modifying settings, adding/removing bookmarks) update local React state **immediately**.
- The change is asynchronously posted to the main process via `window.browserApi.updateSettings(...)` or `window.browserApi.addBookmark(...)`.
- Result: **0ms perceived latency** for all UI controls.

### 3. IPC Serialization Rules
- **Never pass `undefined` for deletion over IPC**: Electron IPC and `JSON.stringify` strip properties with `undefined` values (`JSON.stringify({ customAccent: undefined })` becomes `{}`).
- Always use `null` to explicitly clear or reset values (e.g. `{ customDarkAccent: null }`), and call `delete settings[key]` in both `TabManager` and `App.tsx`.

---

## 5. Security & Isolation Architecture

1. **Strict Context Isolation & Sandboxing**:
   - Shell window and all tab `WebContentsView` instances have `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
2. **Peripheral Hardware Blocking**:
   - `session.defaultSession.setPermissionRequestHandler` strictly denies access to `usb`, `serial`, `bluetooth`, `hid`, `midi`, `midiSysex`, and `openExternal`.
   - Camera, microphone, and geolocation are denied by default.
3. **URL Protocol Vetting**:
   - Tab navigations are validated against `['http:', 'https:', 'about:']`. Malicious schemes like `file://`, `javascript:`, or `data:` in main frame navigation are blocked.
   - Shell window itself is locked to `file://` or `http://localhost:5173` in development.
4. **Linux GPU Sandbox Mitigation**:
   - On Linux systems with Intel Iris Xe / Mesa drivers, `in-process-gpu` flag is appended to prevent driver-level multithreaded crash loops while preserving full hardware acceleration.

---

## 6. Curated Palettes & Dynamic Styling Engine

Palettes are defined in `src/renderer/src/theme/palettes.ts`:

### Dark Palettes
- **Graphite (Default)**: Deep graphite tones with vibrant violet-indigo accents.
- **Midnight**: Deep oceanic blue-black with electric cyan highlights.
- **Warm Charcoal**: Soft dark carbon with warm amber glow.
- **Forest Sage**: Dark evergreen with refreshing mint accents.
- **Pitch Black**: True OLED `#000000` with high-contrast pure white/silver accents.

### Light Palettes
- **Paper (Default)**: Clean warm white with crisp indigo accents.
- **Warm Sand**: Warm linen tones with terracotta accents.
- **Cool Slate**: Clean tech slate with ocean blue accents.
- **Matcha Garden**: Soft matcha and bamboo hues with forest green accents.

### Theme Engine Details
- `applyPalette(palette, customAccent)` injects CSS variables directly to `document.documentElement.style`:
  - `--bg-app`, `--bg-topbar`, `--bg-card`, `--bg-card-hover`, `--bg-input`, `--border-subtle`, `--border-selected`, `--text-main`, `--text-muted`, `--accent-primary`.
- Luminance calculation computes clean, accessible borders and text contrast automatically.

---

## 7. Build, Packaging, and Release Guidelines

### Essential Commands
- **Development**: `npm run dev` (starts Vite dev server and launches Electron).
- **TypeScript & Asset Compilation**: `npm run build`.
- **Arch Linux Package (.pacman)**:
  ```bash
  npm run dist:pacman
  ```
  Produces `release/larp-browser-X.Y.Z.pacman`.
- **Install on Arch Linux**:
  ```bash
  sudo pacman -U release/larp-browser-X.Y.Z.pacman
  ```

### Versioning Rules
- Semantic versioning: `MAJOR.MINOR.PATCH` in `package.json`.
- Increment `PATCH` for bug fixes and UI polish (e.g. 1.2.0 -> 1.2.1).
- Increment `MINOR` for new features (e.g. editable shortcuts & bookmarks in 1.3.0).
- Update version labels in `SettingsModal.tsx` about tab when bumping versions.
