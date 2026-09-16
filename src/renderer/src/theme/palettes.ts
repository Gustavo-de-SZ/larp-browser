export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  mode: 'dark' | 'light';
  colors: {
    bgApp: string;
    bgTopbar: string;
    bgCard: string;
    bgCardSelected: string;
    bgInput: string;
    borderSubtle: string;
    borderCard: string;
    borderSelected: string;
    textMain: string;
    textMuted: string;
    accentPrimary: string;
    accentSecondary: string;
    glowColor: string;
  };
}

export const DARK_PALETTES: ColorPalette[] = [
  {
    id: 'obsidian-neon',
    name: 'Obsidian Neon',
    description: 'Deep midnight indigo with electric violet & cyan glow',
    mode: 'dark',
    colors: {
      bgApp: '#090a10',
      bgTopbar: 'rgba(15, 17, 26, 0.92)',
      bgCard: 'rgba(21, 24, 38, 0.9)',
      bgCardSelected: '#1c2033',
      bgInput: 'rgba(18, 21, 33, 0.95)',
      borderSubtle: 'rgba(168, 85, 247, 0.18)',
      borderCard: 'rgba(255, 255, 255, 0.08)',
      borderSelected: '#a855f7',
      textMain: '#f8fafc',
      textMuted: '#94a3b8',
      accentPrimary: '#a855f7',
      accentSecondary: '#22d3ee',
      glowColor: 'rgba(168, 85, 247, 0.45)',
    },
  },
  {
    id: 'cyber-emerald',
    name: 'Cyber Emerald',
    description: 'Matrix-inspired deep forest with neon mint & teal glow',
    mode: 'dark',
    colors: {
      bgApp: '#060a08',
      bgTopbar: 'rgba(10, 18, 14, 0.92)',
      bgCard: 'rgba(14, 25, 20, 0.9)',
      bgCardSelected: '#183025',
      bgInput: 'rgba(12, 22, 17, 0.95)',
      borderSubtle: 'rgba(16, 185, 129, 0.22)',
      borderCard: 'rgba(255, 255, 255, 0.08)',
      borderSelected: '#10b981',
      textMain: '#f0fdf4',
      textMuted: '#86efac',
      accentPrimary: '#10b981',
      accentSecondary: '#06b6d4',
      glowColor: 'rgba(16, 185, 129, 0.45)',
    },
  },
  {
    id: 'sunset-ember',
    name: 'Sunset Ember',
    description: 'Charcoal obsidian with vibrant crimson & amber fire',
    mode: 'dark',
    colors: {
      bgApp: '#0c080a',
      bgTopbar: 'rgba(20, 13, 16, 0.92)',
      bgCard: 'rgba(28, 18, 22, 0.9)',
      bgCardSelected: '#381f27',
      bgInput: 'rgba(24, 15, 19, 0.95)',
      borderSubtle: 'rgba(244, 63, 94, 0.22)',
      borderCard: 'rgba(255, 255, 255, 0.08)',
      borderSelected: '#f43f5e',
      textMain: '#fff1f2',
      textMuted: '#fda4af',
      accentPrimary: '#f43f5e',
      accentSecondary: '#f59e0b',
      glowColor: 'rgba(244, 63, 94, 0.45)',
    },
  },
  {
    id: 'dracula-velvet',
    name: 'Dracula Velvet',
    description: 'Royal plum dark canvas with hot pink & purple neon',
    mode: 'dark',
    colors: {
      bgApp: '#0d0c15',
      bgTopbar: 'rgba(19, 17, 30, 0.92)',
      bgCard: 'rgba(26, 23, 42, 0.9)',
      bgCardSelected: '#342c54',
      bgInput: 'rgba(22, 19, 36, 0.95)',
      borderSubtle: 'rgba(236, 72, 153, 0.22)',
      borderCard: 'rgba(255, 255, 255, 0.08)',
      borderSelected: '#ec4899',
      textMain: '#fdf2f8',
      textMuted: '#f472b6',
      accentPrimary: '#ec4899',
      accentSecondary: '#8b5cf6',
      glowColor: 'rgba(236, 72, 153, 0.45)',
    },
  },
  {
    id: 'midnight-sapphire',
    name: 'Midnight Sapphire',
    description: 'Deep oceanic abyss with electric blue & cyan aurora',
    mode: 'dark',
    colors: {
      bgApp: '#050711',
      bgTopbar: 'rgba(9, 15, 29, 0.92)',
      bgCard: 'rgba(14, 23, 44, 0.9)',
      bgCardSelected: '#1c2d58',
      bgInput: 'rgba(11, 18, 36, 0.95)',
      borderSubtle: 'rgba(59, 130, 246, 0.22)',
      borderCard: 'rgba(255, 255, 255, 0.08)',
      borderSelected: '#3b82f6',
      textMain: '#eff6ff',
      textMuted: '#93c5fd',
      accentPrimary: '#3b82f6',
      accentSecondary: '#06b6d4',
      glowColor: 'rgba(59, 130, 246, 0.45)',
    },
  },
];

export const LIGHT_PALETTES: ColorPalette[] = [
  {
    id: 'opal-frost',
    name: 'Opal Frost',
    description: 'Crisp frosted oyster with electric iris & cyan accents',
    mode: 'light',
    colors: {
      bgApp: '#f3f5fa',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: 'rgba(255, 255, 255, 0.95)',
      bgCardSelected: '#ffffff',
      bgInput: '#edf2f9',
      borderSubtle: 'rgba(124, 58, 237, 0.16)',
      borderCard: 'rgba(203, 213, 225, 0.8)',
      borderSelected: '#7c3aed',
      textMain: '#0f172a',
      textMuted: '#64748b',
      accentPrimary: '#7c3aed',
      accentSecondary: '#06b6d4',
      glowColor: 'rgba(124, 58, 237, 0.3)',
    },
  },
  {
    id: 'sakura-bloom',
    name: 'Sakura Bloom',
    description: 'Soft petal blush with coral rose & magenta radiance',
    mode: 'light',
    colors: {
      bgApp: '#fcf3f5',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: 'rgba(255, 255, 255, 0.95)',
      bgCardSelected: '#ffffff',
      bgInput: '#fce7eb',
      borderSubtle: 'rgba(244, 63, 94, 0.18)',
      borderCard: 'rgba(254, 205, 211, 0.85)',
      borderSelected: '#f43f5e',
      textMain: '#4c0519',
      textMuted: '#9f1239',
      accentPrimary: '#f43f5e',
      accentSecondary: '#fb7185',
      glowColor: 'rgba(244, 63, 94, 0.3)',
    },
  },
  {
    id: 'nordic-glacier',
    name: 'Nordic Glacier',
    description: 'Cool glacial ice with sapphire & turquoise clarity',
    mode: 'light',
    colors: {
      bgApp: '#f0f7fb',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: 'rgba(255, 255, 255, 0.95)',
      bgCardSelected: '#ffffff',
      bgInput: '#e0f2fe',
      borderSubtle: 'rgba(2, 132, 199, 0.18)',
      borderCard: 'rgba(186, 230, 253, 0.85)',
      borderSelected: '#0284c7',
      textMain: '#082f49',
      textMuted: '#0369a1',
      accentPrimary: '#0284c7',
      accentSecondary: '#06b6d4',
      glowColor: 'rgba(2, 132, 199, 0.3)',
    },
  },
  {
    id: 'matcha-garden',
    name: 'Matcha Garden',
    description: 'Peaceful sage cream with lush emerald & botanical accents',
    mode: 'light',
    colors: {
      bgApp: '#f1f8f3',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: 'rgba(255, 255, 255, 0.95)',
      bgCardSelected: '#ffffff',
      bgInput: '#dcfce7',
      borderSubtle: 'rgba(16, 185, 129, 0.18)',
      borderCard: 'rgba(187, 247, 208, 0.85)',
      borderSelected: '#10b981',
      textMain: '#064e3b',
      textMuted: '#047857',
      accentPrimary: '#10b981',
      accentSecondary: '#14b8a6',
      glowColor: 'rgba(16, 185, 129, 0.3)',
    },
  },
  {
    id: 'solar-citrus',
    name: 'Solar Citrus',
    description: 'Warm morning light with golden tangerine & honey warmth',
    mode: 'light',
    colors: {
      bgApp: '#fefbf3',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: 'rgba(255, 255, 255, 0.95)',
      bgCardSelected: '#ffffff',
      bgInput: '#fef3c7',
      borderSubtle: 'rgba(217, 119, 6, 0.18)',
      borderCard: 'rgba(253, 230, 138, 0.85)',
      borderSelected: '#d97706',
      textMain: '#451a03',
      textMuted: '#b45309',
      accentPrimary: '#d97706',
      accentSecondary: '#f59e0b',
      glowColor: 'rgba(217, 119, 6, 0.3)',
    },
  },
];

export function getPalette(id: string, mode: 'dark' | 'light'): ColorPalette {
  const list = mode === 'dark' ? DARK_PALETTES : LIGHT_PALETTES;
  return list.find((p) => p.id === id) || list[0];
}

export function applyPalette(palette: ColorPalette, customAccent?: string) {
  const root = document.documentElement;
  const colors = palette.colors;
  const primaryAccent = customAccent || colors.accentPrimary;

  root.style.setProperty('--bg-app', colors.bgApp);
  root.style.setProperty('--bg-topbar', colors.bgTopbar);
  root.style.setProperty('--bg-card', colors.bgCard);
  root.style.setProperty('--bg-card-selected', colors.bgCardSelected);
  root.style.setProperty('--bg-input', colors.bgInput);
  root.style.setProperty('--border-subtle', colors.borderSubtle);
  root.style.setProperty('--border-card', colors.borderCard);
  root.style.setProperty('--border-selected', primaryAccent);
  root.style.setProperty('--text-main', colors.textMain);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--accent-primary', primaryAccent);
  root.style.setProperty('--accent-secondary', colors.accentSecondary);
  root.style.setProperty('--glow-color', customAccent ? `${customAccent}77` : colors.glowColor);
}
