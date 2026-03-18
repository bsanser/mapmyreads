import { COUNTRIES } from './countries';
import { darkenColor } from './themeManager';

// Cache for generated heatmap styles — keyed on actual country distribution + theme
const heatmapCache = new Map<string, ReturnType<typeof buildHeatmapStyle>>();

// Calculate country book counts for heatmap
export const getCountryBookCounts = (books: any[]) => {
  const countryCounts: Record<string, number> = {};

  // Initialize all available countries with 0
  COUNTRIES.forEach(country => {
    countryCounts[country.iso2] = 0;
  });

  books.forEach(book => {
    if (book.readStatus && book.readStatus !== 'read') {
      return;
    }
    const countriesToCount = (book.authorCountries && book.authorCountries.length > 0)
      ? book.authorCountries
      : book.bookCountries;

    countriesToCount?.forEach((countryCode: string) => {
      if (countryCounts.hasOwnProperty(countryCode)) {
        countryCounts[countryCode]++;
      }
    });
  });

  return countryCounts;
};

// Pure builder — accepts pre-computed countryCounts to avoid double computation
function buildHeatmapStyle(countryCounts: Record<string, number>, currentTheme: any) {
  const baseColor = currentTheme.fill;
  const outlineColor = currentTheme.outline;

  const maxCount = Math.max(...Object.values(countryCounts));

  const emptyColor = currentTheme.empty ?? "#f5f0e8";

  if (maxCount === 0) {
    return emptyColor;
  }

  return [
    "case",
    ...Object.entries(countryCounts).flatMap(([iso2, count]) => {
      if (count === 0) return [];
      const color =
        count === 1 ? baseColor :
        count === 2 ? darkenColor(baseColor, 0.15) :
        outlineColor;
      return [["==", ["get", "ISO3166-1-Alpha-2"], iso2], color];
    }),
    emptyColor
  ];
}

// Generate the complete heatmap style based on current data.
// Memoized on actual country distribution + theme to correctly invalidate when
// book→country mapping changes (e.g. after each author resolution batch).
export const generateHeatmapStyle = (books: any[], currentTheme: any): any => {
  const countryCounts = getCountryBookCounts(books);
  const nonZero = Object.entries(countryCounts)
    .filter(([, c]) => c > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso2, c]) => `${iso2}:${c}`)
    .join(',');
  const cacheKey = `${nonZero}:${currentTheme.fill}:${currentTheme.outline}`;

  if (heatmapCache.has(cacheKey)) {
    return heatmapCache.get(cacheKey);
  }
  const style = buildHeatmapStyle(countryCounts, currentTheme);
  heatmapCache.set(cacheKey, style);
  return style;
};
