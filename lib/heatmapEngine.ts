import { COUNTRIES } from './countries';
import { darkenColor } from './themeManager';

// Cache for generated heatmap styles — keyed on bookCount:themeKey
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

// Pure builder — separated so the memoized wrapper can call it
function buildHeatmapStyle(books: any[], currentTheme: any) {
  const countryCounts = getCountryBookCounts(books);
  const baseColor = currentTheme.fill;
  const outlineColor = currentTheme.outline;

  const maxCount = Math.max(...Object.values(countryCounts));

  if (maxCount === 0) {
    return "#ffffff";
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
    "#ffffff"
  ];
}

// Generate the complete heatmap style based on current data.
// Memoized on book count + theme key to avoid rebuilding on every render.
export const generateHeatmapStyle = (books: any[], currentTheme: any): any => {
  const cacheKey = `${books.length}:${currentTheme.fill}:${currentTheme.outline}`;
  if (heatmapCache.has(cacheKey)) {
    return heatmapCache.get(cacheKey);
  }
  const style = buildHeatmapStyle(books, currentTheme);
  heatmapCache.set(cacheKey, style);
  return style;
};
