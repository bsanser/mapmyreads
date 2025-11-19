// Apple-inspired theme system with carefully balanced colors
export const THEMES = {
  blue: {
    name: "Ocean Blue",
    fill: "#B3D9E5",      // Light blue
    outline: "#0A6A89",   // Dark blue
    hover: "#7FB3C7",     // Medium blue
    selected: "#E8F4F8",  // Very light blue with subtle glow
    background: "#eef3f5" // Light blue-gray background
  },
  yellow: {
    name: "Golden Hour",
    fill: "#F4E4BC",      // Light warm yellow
    outline: "#D4A574",   // Rich golden brown
    hover: "#E8D4A8",     // Medium warm yellow
    selected: "#FDF8E8",  // Very light cream with subtle glow
    background: "#fefbf3" // Warm off-white background
  },
  purple: {
    name: "Royal Purple",
    fill: "#E8D4F0",      // Light lavender
    outline: "#8B5A96",   // Rich purple
    hover: "#D4B8E0",     // Medium lavender
    selected: "#F8F0FC",  // Very light lavender with subtle glow
    background: "#f9f6fc" // Light purple-tinted background
  },
  pink: {
    name: "Rose Garden",
    fill: "#F4D4E0",      // Light rose pink
    outline: "#C85A7B",   // Rich rose
    hover: "#E8B8CC",     // Medium rose pink
    selected: "#FDF0F5",  // Very light rose with subtle glow
    background: "#fef8fa" // Light pink-tinted background
  },
  green: {
    name: "Verdant Grove",
    fill: "#D9F2DC",      // Light mint green
    outline: "#3C8B5E",   // Rich forest green
    hover: "#BEE5C3",     // Medium soft green
    selected: "#F1FBF2",  // Very light mint glow
    background: "#f4fbf5" // Light green-tinted background
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
