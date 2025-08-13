import { COUNTRIES, toISO2, toDisplayName } from './countries';

// Available countries for mock data (ISO2 codes)
export const AVAILABLE_COUNTRIES = COUNTRIES;

// Function to map display names back to ISO2 codes
export const mapDisplayNameToISO2 = (displayName: string): string => {
  return toISO2(displayName) || displayName;
};

// Function to map ISO2 codes to display names
export const mapISO2ToDisplayName = (iso2: string): string => {
  return toDisplayName(iso2) || iso2;
};

// Function to assign mock countries to books for testing
export const assignMockCountriesToBooks = (books: any[]): any[] => {
  if (!books || books.length === 0) return books;
  
  const booksWithCountries = books.map((book, index) => {
    // Skip if book already has a country
    if (book.country) return book;
    
    // Assign a country based on index to ensure variety
    const countryIndex = index % AVAILABLE_COUNTRIES.length;
    const assignedCountry = AVAILABLE_COUNTRIES[countryIndex];
    
    return {
      ...book,
      country: assignedCountry.iso2,
      authorCountry: assignedCountry.iso2 // For now, use same country for both
    };
  });
  
  return booksWithCountries;
};

// Function to get unique countries from books
export const getUniqueCountriesFromBooks = (books: any[], field: 'country' | 'authorCountry'): string[] => {
  if (!books || books.length === 0) return [];
  
  const countries = books
    .map(book => book[field])
    .filter(Boolean) // Remove undefined/null values
    .filter((country, index, arr) => arr.indexOf(country) === index); // Remove duplicates
  
  return countries;
};

// Function to get books by country
export const getBooksByCountry = (books: any[], countryName: string, field: 'country' | 'authorCountry'): any[] => {
  if (!books || books.length === 0) return [];
  
  return books.filter(book => {
    const bookCountry = book[field];
    if (!bookCountry) return false;
    
    // Try to match by ISO2 code first
    if (bookCountry === countryName) return true;
    
    // Try to match by display name
    const country = COUNTRIES.find(c => c.iso2 === bookCountry);
    if (country && country.displayName === countryName) return true;
    
    // Try to match by alternatives
    if (country && country.alternatives.includes(countryName)) return true;
    
    return false;
  });
};

// Function to get country display name from ISO2 code
export const getCountryDisplayName = (iso2: string): string => {
  const country = COUNTRIES.find(c => c.iso2 === iso2);
  return country ? country.displayName : 'Unknown Country';
};

// Function to get country flag from ISO2 code
export const getCountryFlag = (iso2: string): string => {
  const country = COUNTRIES.find(c => c.iso2 === iso2);
  return country ? country.flag : '🏳️';
};

// Function to check if a country has books
export const countryHasBooks = (books: any[], countryName: string, field: 'country' | 'authorCountry'): boolean => {
  return getBooksByCountry(books, countryName, field).length > 0;
};

// Function to get book count for a country
export const getBookCountForCountry = (books: any[], countryName: string, field: 'country' | 'authorCountry'): number => {
  return getBooksByCountry(books, countryName, field).length;
};
