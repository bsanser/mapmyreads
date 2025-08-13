import { COUNTRIES } from './countries';
import { darkenColor } from './themeManager';

// Available countries for mock data (ISO2 codes)
const AVAILABLE_COUNTRIES = COUNTRIES;

// Calculate country book counts for heatmap
export const getCountryBookCounts = (books: any[], countryViewMode: 'author' | 'book') => {
  const countryCounts: Record<string, number> = {};
  
  // Initialize all available countries with 0
  Object.keys(AVAILABLE_COUNTRIES).forEach(countryCode => {
    countryCounts[countryCode] = 0;
  });
  
  // Count books for each country based on current view mode
  // Default to 'book' countries (where books are set), not author countries
  const viewMode = countryViewMode || 'book';
  
  books.forEach(book => {
    // Only count countries based on the current view mode
    const countriesToCount = viewMode === 'author' ? book.authorCountries : book.bookCountries;
    
    countriesToCount?.forEach((countryCode: string) => {
      if (countryCounts.hasOwnProperty(countryCode)) {
        countryCounts[countryCode]++;
      }
    });
  });
  
  return countryCounts;
};

// Generate the complete heatmap style based on current data
export const generateHeatmapStyle = (books: any[], countryViewMode: 'author' | 'book', currentTheme: any) => {
  const countryCounts = getCountryBookCounts(books, countryViewMode);
  const baseColor = currentTheme.fill;
  const outlineColor = currentTheme.outline;
  
  console.log('🔍 DEBUG: Country counts:', countryCounts);
  console.log('🔍 DEBUG: Current theme:', currentTheme);
  console.log('🔍 DEBUG: Base color:', baseColor);
  console.log('🔍 DEBUG: Outline color:', outlineColor);
  console.log('🔍 DEBUG: Available themes:', Object.keys(currentTheme));
  
  // Create a simpler approach: use case expression with specific country codes
  // This is more reliable than the complex match expression
  const heatmapStyle = [
    "case",
    // For each country with books, define its color based on count
    ...Object.entries(countryCounts).flatMap(([iso2, count]) => {
      if (count === 0) return []; // Skip countries with 0 books (they'll be white by default)
      
      let color;
      if (count === 1) {
        color = baseColor;
      } else if (count === 2) {
        color = darkenColor(baseColor, 0.15);
      } else {
        color = outlineColor;
      }
      
      console.log(`🔍 DEBUG: Country ${iso2} with ${count} books gets color:`, color);
      
      return [
        ["==", ["get", "ISO3166-1-Alpha-2"], iso2],
        color
      ];
    }),
    "#ffffff" // Default white for all other countries
  ];
  
  console.log('🔍 DEBUG: Generated heatmap style:', heatmapStyle);
  return heatmapStyle;
};
