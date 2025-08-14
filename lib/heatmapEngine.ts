import { COUNTRIES } from './countries';
import { darkenColor } from './themeManager';

// Available countries for mock data (ISO2 codes)
const AVAILABLE_COUNTRIES = COUNTRIES;

// Calculate country book counts for heatmap
export const getCountryBookCounts = (books: any[], countryViewMode: 'author' | 'book') => {
  const countryCounts: Record<string, number> = {};
  
  // Initialize all available countries with 0
  AVAILABLE_COUNTRIES.forEach(country => {
    countryCounts[country.iso2] = 0;
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
  
  // For now, use a simple approach: color countries that have books
  const countriesWithBooks = Object.entries(countryCounts)
    .filter(([iso2, count]) => count > 0)
    .map(([iso2]) => iso2);
  
  if (countriesWithBooks.length === 0) {
    return "#ffffff"; // Default white if no books
  }
  
  // Create a simple case expression
  const heatmapStyle = [
    "case",
    ...countriesWithBooks.flatMap(iso2 => [
      ["==", ["get", "ISO3166-1-Alpha-2"], iso2],
      baseColor
    ]),
    "#ffffff" // Default white for all other countries
  ];
  
  return heatmapStyle;
};
