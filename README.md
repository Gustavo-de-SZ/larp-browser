# Larp Browser (lol)

A minimalist, high-performance desktop web browser built with electron.

Replaces the cluttered top horizontal tab bar with a keyboard-first, visual **Alt-Tab / Ctrl-Shift-Tab** switcher HUD with live snapshot previews.

---

Visual Design & Color Palettes

Allows you decent customization regarding the browser's natural look
Both dark and light mode have their presets which are also customizable

---

## Key Features

- **No Tab Clutter:** The top tab bar doesn't contain any tabs, instead they are located in the cntrl tab funcion
- **Ctrl-Tab Visual Switcher HUD:**
  - Press `Ctrl+Shift+Tab` (or `Ctrl+Tab`) to pop up a centered, dark-blurred glassmorphic HUD.
  - Displays all open tabs in **Most Recently Used (MRU)** order.
  - Crisp live snapshot card previews captured via `webContents.capturePage()`.
  - Favicon, domain name, page title, audio playing/muted indicators, and last-accessed timestamp on every card.
  - Number keys (`1`–`9`) to jump directly to any tab.
  - Search bar for quickly finding/filtering
---

Default kb shortcuts (can be changed to ur liking)

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
