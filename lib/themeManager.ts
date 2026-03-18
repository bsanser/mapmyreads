// Warm & indie editorial map themes
export const THEMES = {
  ink: {
    name: "Inkwell",
    fill: "#C8D8D5",      // Muted teal-gray, like faded ink wash
    outline: "#2C4A52",   // Deep teal-slate, like fountain pen ink
    hover: "#A8C4C0",     // Deeper teal-gray
    selected: "#E8F2F0",  // Very light teal glow
    background: "#E8EEF0",// Cool parchment, like aged paper under ink
    empty: "#F0EBE0"      // Warm cream, unread
  },
  amber: {
    name: "Amber Road",
    fill: "#E8C87A",      // Warm amber gold
    outline: "#8B4513",   // Saddle brown, burnt sienna
    hover: "#D4A855",     // Deeper amber
    selected: "#FDF3DC",  // Very light amber glow
    background: "#F5ECD5",// Warm sand
    empty: "#F0EBE0"      // Warm cream, unread
  },
  sage: {
    name: "Sage & Stone",
    fill: "#C4D4B8",      // Soft sage green
    outline: "#4A6741",   // Deep forest green
    hover: "#A8C098",     // Deeper sage
    selected: "#EBF2E6",  // Very light sage glow
    background: "#EDF2E8",// Pale green mist
    empty: "#F0EBE0"      // Warm cream, unread
  },
  dusk: {
    name: "Dusk Atlas",
    fill: "#D4C0CC",      // Dusty mauve-rose, warm not cold
    outline: "#7A5068",   // Deep plum-rose
    hover: "#C0A8B8",     // Deeper mauve
    selected: "#F5EEF2",  // Very light rose glow
    background: "#F2EBF0",// Pale dusty rose
    empty: "#F0EBE0"      // Warm cream, unread
  },
  sepia: {
    name: "Sepia & Salt",
    fill: "#D4B896",      // Warm sepia tan
    outline: "#6B4423",   // Dark burnt umber
    hover: "#C0A07A",     // Deeper sepia
    selected: "#F5EAD8",  // Very light sepia glow
    background: "#EDE0C8",// Aged parchment
    empty: "#F0EBE0"      // Warm cream, unread
  }
};

export type ThemeKey = keyof typeof THEMES;

// Helper function to darken a color
export const darkenColor = (color: string, factor: number): string => {
  // Simple color darkening for hex colors
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(0, 2), 16) * (1 - factor))));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(2, 2), 16) * (1 - factor))));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(4, 2), 16) * (1 - factor))));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Get theme by key
export const getTheme = (key: ThemeKey) => THEMES[key];

// Get all available theme keys
export const getThemeKeys = (): ThemeKey[] => Object.keys(THEMES) as ThemeKey[];

// Get theme names for display
export const getThemeNames = (): Record<ThemeKey, string> => {
  const names: Record<ThemeKey, string> = {} as Record<ThemeKey, string>;
  Object.entries(THEMES).forEach(([key, theme]) => {
    names[key as ThemeKey] = theme.name;
  });
  return names;
};
