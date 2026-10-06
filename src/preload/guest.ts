import { webFrame } from 'electron';

// Guest page preload script
// Intercepts window.open in the guest page to prevent popup-blocker fallback redirects.
// When Electron's setWindowOpenHandler denies a popup to open it in an internal browser tab instead,
// native window.open() returns null. Modern websites (e.g. Mercado Livre, payment gateways) inspect
// the return value:
//   const popup = window.open(targetUrl, '_blank');
//   if (!popup || popup.closed) { window.location.href = targetUrl; }
// When window.open returns null, the site assumes a popup blocker blocked the action,
// causing it to redirect the current tab AND opening the new tab, leading to duplicate tabs.
// By returning a safe WindowProxy placeholder when native window.open returns null,
// we ensure the site recognizes the window as opened, preventing unwanted duplicate navigations.
try {
  webFrame.executeJavaScript(`
    (() => {
      const origOpen = window.open;
      if (typeof origOpen !== 'function') return;

      window.open = function(url, target, features) {
        const res = origOpen.call(this, url, target, features);
        if (res === null) {
          const targetUrl = typeof url === 'string' ? url : (url ? String(url) : '');
          const dummyWin = {
            closed: false,
            close: () => {},
            focus: () => {},
            blur: () => {},
            postMessage: () => {},
            opener: window,
            name: typeof target === 'string' ? target : '',
            location: {
              href: targetUrl,
              assign: () => {},
              replace: () => {},
              reload: () => {},
              toString: () => targetUrl,
            },
          };
          dummyWin.window = dummyWin;
          dummyWin.self = dummyWin;
          dummyWin.frames = dummyWin;
          return dummyWin;
        }
        return res;
      };
    })();
  `);
} catch (err) {
  console.warn('[GuestPreload] Failed to inject window.open handler:', err);
}
