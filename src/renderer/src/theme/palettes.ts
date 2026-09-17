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
    id: 'graphite',
    name: 'Graphite',
    description: 'Clean neutral dark charcoal with calm blue accent',
    mode: 'dark',
    colors: {
      bgApp: '#121214',
      bgTopbar: 'rgba(20, 20, 24, 0.95)',
      bgCard: '#1a1a1e',
      bgCardSelected: '#23232a',
      bgInput: '#18181c',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderCard: 'rgba(255, 255, 255, 0.1)',
      borderSelected: '#3b82f6',
      textMain: '#f4f4f5',
      textMuted: '#a1a1aa',
      accentPrimary: '#3b82f6',
      accentSecondary: '#60a5fa',
      glowColor: 'rgba(59, 130, 246, 0.15)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Slate',
    description: 'Cool deep slate navy with understated sky blue',
    mode: 'dark',
    colors: {
      bgApp: '#0f172a',
      bgTopbar: 'rgba(15, 23, 42, 0.95)',
      bgCard: '#1e293b',
      bgCardSelected: '#273549',
      bgInput: '#172033',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderCard: 'rgba(255, 255, 255, 0.1)',
      borderSelected: '#38bdf8',
      textMain: '#f8fafc',
      textMuted: '#94a3b8',
      accentPrimary: '#38bdf8',
      accentSecondary: '#818cf8',
      glowColor: 'rgba(56, 189, 248, 0.15)',
    },
  },
  {
    id: 'warm-charcoal',
    name: 'Warm Charcoal',
    description: 'Cozy dark umber with warm amber accent',
    mode: 'dark',
    colors: {
      bgApp: '#171615',
      bgTopbar: 'rgba(26, 25, 23, 0.95)',
      bgCard: '#242220',
      bgCardSelected: '#302d2a',
      bgInput: '#1f1d1b',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderCard: 'rgba(255, 255, 255, 0.1)',
      borderSelected: '#f59e0b',
      textMain: '#fafaf9',
      textMuted: '#a8a29e',
      accentPrimary: '#f59e0b',
      accentSecondary: '#fbbf24',
      glowColor: 'rgba(245, 158, 11, 0.15)',
    },
  },
  {
    id: 'forest-sage',
    name: 'Forest Sage',
    description: 'Quiet dark botanical green with muted mint',
    mode: 'dark',
    colors: {
      bgApp: '#111614',
      bgTopbar: 'rgba(20, 27, 23, 0.95)',
      bgCard: '#1a231e',
      bgCardSelected: '#232f28',
      bgInput: '#161f1a',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderCard: 'rgba(255, 255, 255, 0.1)',
      borderSelected: '#10b981',
      textMain: '#f0fdf4',
      textMuted: '#a7f3d0',
      accentPrimary: '#10b981',
      accentSecondary: '#34d399',
      glowColor: 'rgba(16, 185, 129, 0.15)',
    },
  },
  {
    id: 'pitch-black',
    name: 'Pitch Black',
    description: 'High contrast minimalist OLED black with crisp white accent',
    mode: 'dark',
    colors: {
      bgApp: '#000000',
      bgTopbar: 'rgba(14, 14, 14, 0.95)',
      bgCard: '#121212',
      bgCardSelected: '#1e1e1e',
      bgInput: '#0d0d0d',
      borderSubtle: 'rgba(255, 255, 255, 0.12)',
      borderCard: 'rgba(255, 255, 255, 0.14)',
      borderSelected: '#ffffff',
      textMain: '#ffffff',
      textMuted: '#a1a1aa',
      accentPrimary: '#ffffff',
      accentSecondary: '#d4d4d8',
      glowColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
];

export const LIGHT_PALETTES: ColorPalette[] = [
  {
    id: 'paper',
    name: 'Paper',
    description: 'Clean off-white with crisp slate text & classic blue',
    mode: 'light',
    colors: {
      bgApp: '#fafafa',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: '#ffffff',
      bgCardSelected: '#f4f4f5',
      bgInput: '#f4f4f5',
      borderSubtle: 'rgba(0, 0, 0, 0.08)',
      borderCard: 'rgba(0, 0, 0, 0.09)',
      borderSelected: '#2563eb',
      textMain: '#18181b',
      textMuted: '#71717a',
      accentPrimary: '#2563eb',
      accentSecondary: '#3b82f6',
      glowColor: 'rgba(37, 99, 235, 0.1)',
    },
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    description: 'Warm natural cream and paper with gentle amber accent',
    mode: 'light',
    colors: {
      bgApp: '#fbfaf8',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: '#ffffff',
      bgCardSelected: '#f5f3ef',
      bgInput: '#f3f1ec',
      borderSubtle: 'rgba(0, 0, 0, 0.07)',
      borderCard: 'rgba(0, 0, 0, 0.08)',
      borderSelected: '#d97706',
      textMain: '#292524',
      textMuted: '#78716c',
      accentPrimary: '#d97706',
      accentSecondary: '#b45309',
      glowColor: 'rgba(217, 119, 6, 0.1)',
    },
  },
  {
    id: 'cool-slate',
    name: 'Cool Slate',
    description: 'Fresh cool gray with calm sky accent',
    mode: 'light',
    colors: {
      bgApp: '#f8fafc',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: '#ffffff',
      bgCardSelected: '#f1f5f9',
      bgInput: '#f1f5f9',
      borderSubtle: 'rgba(0, 0, 0, 0.08)',
      borderCard: 'rgba(0, 0, 0, 0.09)',
      borderSelected: '#0284c7',
      textMain: '#0f172a',
      textMuted: '#64748b',
      accentPrimary: '#0284c7',
      accentSecondary: '#0ea5e9',
      glowColor: 'rgba(2, 132, 199, 0.1)',
    },
  },
  {
    id: 'matcha-garden',
    name: 'Matcha Tea',
    description: 'Soft botanical green with soothing sage accent',
    mode: 'light',
    colors: {
      bgApp: '#f6f8f6',
      bgTopbar: 'rgba(255, 255, 255, 0.92)',
      bgCard: '#ffffff',
      bgCardSelected: '#edf2ed',
      bgInput: '#edf2ed',
      borderSubtle: 'rgba(0, 0, 0, 0.07)',
      borderCard: 'rgba(0, 0, 0, 0.08)',
      borderSelected: '#059669',
      textMain: '#064e3b',
      textMuted: '#047857',
      accentPrimary: '#059669',
      accentSecondary: '#10b981',
      glowColor: 'rgba(5, 150, 105, 0.1)',
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
  root.style.setProperty('--glow-color', customAccent ? `${customAccent}25` : colors.glowColor);
}
