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
    if (book.readStatus && book.readStatus !== 'read') {
      return;
    }
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
  
  // Find the maximum book count to normalize the heatmap
  const maxCount = Math.max(...Object.values(countryCounts));
  
  if (maxCount === 0) {
    return "#ffffff"; // Default white if no books
  }
  
  // Create a heatmap with different shades based on book count
  const heatmapStyle = [
    "case",
    // For each country with books, create a color based on count
    ...Object.entries(countryCounts).flatMap(([iso2, count]) => {
      if (count === 0) return [];
      
      let color;
      if (count === 0) {
        color = "#ffffff"; // 0 books = white
      } else if (count === 1) {
        color = baseColor; // 1 book = light theme color
      } else if (count === 2) {
        color = darkenColor(baseColor, 0.15); // 2 books = medium shade
      } else {
        color = outlineColor; // 3+ books = darkest theme color
      }
      
      return [
        ["==", ["get", "ISO3166-1-Alpha-2"], iso2],
        color
      ];
    }),
    "#ffffff" // Default white for countries with no books
  ];
  
  return heatmapStyle;
};
