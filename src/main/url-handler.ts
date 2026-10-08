import fs from 'fs';
import path from 'path';

/**
 * Extracts valid target URLs from command line arguments passed to Electron.
 * Filters out flags/switches, binary paths, entry scripts, and desktop placeholders.
 */
export function extractUrlsFromArgs(args: string[]): string[] {
  if (!args || !Array.isArray(args)) return [];
  const urls: string[] = [];

  for (const rawArg of args) {
    if (!rawArg || typeof rawArg !== 'string') continue;
    const arg = rawArg.trim();

    if (!arg) continue;

    // Check for standard web and file protocols first
    if (
      arg.startsWith('http://') ||
      arg.startsWith('https://') ||
      arg.startsWith('file://') ||
      arg.startsWith('ftp://')
    ) {
      urls.push(arg);
      continue;
    }

    // Skip flags/switches (e.g. --in-process-gpu, -v)
    if (arg.startsWith('-')) continue;

    // Skip unexpanded desktop entry spec placeholders (%U, %u, %F, %f)
    if (/^%[uUfF]$/.test(arg)) continue;

    // Skip node / electron script entry points
    if (
      arg === '.' ||
      arg.endsWith('.js') ||
      arg.endsWith('.cjs') ||
      arg.endsWith('.mjs') ||
      arg.endsWith('.ts') ||
      arg.endsWith('package.json')
    ) {
      continue;
    }

    // Skip executable binaries
    const lower = arg.toLowerCase();
    const basename = path.basename(lower);
    if (
      basename === 'electron' ||
      basename === 'electron.exe' ||
      basename === 'larp-browser' ||
      basename === 'larp-browser.exe'
    ) {
      continue;
    }

    // Custom scheme handler (e.g. mailto:..., larp://...)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/.test(arg)) {
      urls.push(arg);
      continue;
    }

    // Check if it's an existing local file (e.g. /home/user/page.html)
    if (arg.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(arg)) {
      try {
        if (fs.existsSync(arg) && fs.statSync(arg).isFile()) {
          urls.push(`file://${path.resolve(arg)}`);
          continue;
        }
      } catch {}
    }

    // Domain pattern without protocol (e.g. "github.com" or "localhost:3000")
    if (
      /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(arg) ||
      /^localhost(:\d+)?(\/.*)?$/.test(arg)
    ) {
      urls.push(`https://${arg}`);
      continue;
    }
  }

  return urls;
}
