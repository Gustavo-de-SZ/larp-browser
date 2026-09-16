# Aero Browser

A minimalist, high-performance desktop web browser built with **modern Electron (`WebContentsView`)**, **React 19**, and **Tailwind CSS**.

Aero completely replaces the cluttered top horizontal tab bar with a keyboard-first, visual **Alt-Tab / Ctrl-Shift-Tab** switcher HUD with live snapshot previews.

---

## Key Features

- **No Tab Clutter:** The top tab bar is replaced with a sleek, 44px glassmorphic omnibar that gives 100% of the screen estate to the active website.
- **Alt-Tab / Ctrl-Shift-Tab Visual Switcher HUD:**
  - Press `Ctrl+Shift+Tab` (or `Ctrl+Tab`) to pop up a dark-blurred glassmorphic HUD.
  - Displays all open tabs in **Most Recently Used (MRU)** order.
  - Crisp live snapshot card previews captured via `webContents.capturePage()`.
  - Favicon, domain name, page title, audio playing/muted indicators, and last-accessed timestamp on every card.
  - Number keys (`1`–`9`) to jump directly to any tab.
  - Instant fuzzy search to filter active tabs.
- **Modern Electron Architecture:**
  - Uses Electron's modern `WebContentsView` (Electron 41).
  - Each tab runs in an isolated native view.
  - Smooth z-ordering and zero-latency switching.
  - Native global shortcut interceptor using `before-input-event` so shortcuts work even when focused on complex web pages or iframes.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Ctrl+Shift+Tab`** | Open Tab Switcher HUD & cycle backward |
| **`Ctrl+Tab`** | Cycle forward through tabs in HUD |
| **Release `Ctrl`** / **`Enter`** | Switch to selected tab |
| **`1` – `9`** | Jump directly to tab by number |
| **`W`** / **`Delete`** | Close highlighted tab in HUD |
| **`Esc`** | Dismiss Tab Switcher HUD |
| **`Ctrl+T`** | Open new tab |
| **`Ctrl+W`** | Close current tab |
| **`Ctrl+R`** / **`F5`** | Reload active tab |
| **`Ctrl+L`** | Focus address bar |
| **`Alt+Left`** | Go back in history |
| **`Alt+Right`** | Go forward in history |

---

## Getting Started

### 1. Build and Run in Production Mode
```bash
npm run build
npm start
```

### 2. Run in Live Development Mode (Vite HMR)
```bash
npm run dev
```
