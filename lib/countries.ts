// Centralized country information and utilities
// This file ensures consistent country handling across the entire application

export interface CountryInfo {
  iso2: string;
  iso3: string;
  name: string;
  displayName: string;
  flag: string;
  alternatives: string[];
}

// Comprehensive country database with ISO2 codes as keys
export const COUNTRIES: Record<string, CountryInfo> = {
  'ES': {
    iso2: 'ES',
    iso3: 'ESP',
    name: 'Spain',
    displayName: 'Spain',
    flag: '🇪🇸',
    alternatives: ['spain', 'españa', 'madrid', 'barcelona', 'valencia']
  },
  'FR': {
    iso2: 'FR',
    iso3: 'FRA',
    name: 'France',
    displayName: 'France',
    flag: '🇫🇷',
    alternatives: ['france', 'paris', 'marseille', 'lyon', 'toulouse']
  },
  'DE': {
    iso2: 'DE',
    iso3: 'DEU',
    name: 'Germany',
    displayName: 'Germany',
    flag: '🇩🇪',
    alternatives: ['germany', 'deutschland', 'berlin', 'munich', 'hamburg']
  },
  'IT': {
    iso2: 'IT',
    iso3: 'ITA',
    name: 'Italy',
    displayName: 'Italy',
    flag: '🇮🇹',
    alternatives: ['italy', 'italia', 'rome', 'milan', 'naples', 'turin']
  },
  'US': {
    iso2: 'US',
    iso3: 'USA',
    name: 'United States',
    displayName: 'United States',
    flag: '🇺🇸',
    alternatives: ['united states', 'usa', 'america', 'new york', 'california', 'texas']
  },
  'CA': {
    iso2: 'CA',
    iso3: 'CAN',
    name: 'Canada',
    displayName: 'Canada',
    flag: '🇨🇦',
    alternatives: ['canada', 'toronto', 'montreal', 'vancouver', 'calgary']
  },
  'BR': {
    iso2: 'BR',
    iso3: 'BRA',
    name: 'Brazil',
    displayName: 'Brazil',
    flag: '🇧🇷',
    alternatives: ['brazil', 'brasil', 'são paulo', 'rio de janeiro', 'salvador']
  },
  'AR': {
    iso2: 'AR',
    iso3: 'ARG',
    name: 'Argentina',
    displayName: 'Argentina',
    flag: '🇦🇷',
    alternatives: ['argentina', 'buenos aires', 'córdoba', 'rosario', 'mendoza']
  },
  'JP': {
    iso2: 'JP',
    iso3: 'JPN',
    name: 'Japan',
    displayName: 'Japan',
    flag: '🇯🇵',
    alternatives: ['japan', 'japón', 'tokyo', 'osaka', 'kyoto', 'yokohama']
  },
  'AU': {
    iso2: 'AU',
    iso3: 'AUS',
    name: 'Australia',
    displayName: 'Australia',
    flag: '🇦🇺',
    alternatives: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth']
  },
  'GB': {
    iso2: 'GB',
    iso3: 'GBR',
    name: 'United Kingdom',
    displayName: 'United Kingdom',
    flag: '🇬🇧',
    alternatives: ['united kingdom', 'uk', 'england', 'britain', 'london', 'manchester']
  },
  'MX': {
    iso2: 'MX',
    iso3: 'MEX',
    name: 'Mexico',
    displayName: 'Mexico',
    flag: '🇲🇽',
    alternatives: ['mexico', 'méxico', 'mexico city', 'guadalajara', 'monterrey']
  },
  'IN': {
    iso2: 'IN',
    iso3: 'IND',
    name: 'India',
    displayName: 'India',
    flag: '🇮🇳',
    alternatives: ['india', 'mumbai', 'delhi', 'bangalore', 'hyderabad']
  },
  'CN': {
    iso2: 'CN',
    iso3: 'CHN',
    name: 'China',
    displayName: 'China',
    flag: '🇨🇳',
    alternatives: ['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen']
  },
  'RU': {
    iso2: 'RU',
    iso3: 'RUS',
    name: 'Russia',
    displayName: 'Russia',
    flag: '🇷🇺',
    alternatives: ['russia', 'россия', 'moscow', 'saint petersburg', 'novosibirsk']
  }
};

// Utility functions for consistent country handling

/**
 * Get country info by ISO2 code
 */
export const getCountryByISO2 = (iso2: string): CountryInfo | undefined => {
  return COUNTRIES[iso2.toUpperCase()];
};

/**
 * Get country info by display name (case-insensitive)
 */
export const getCountryByDisplayName = (displayName: string): CountryInfo | undefined => {
  const normalized = displayName.toLowerCase().trim();
  
  // First try exact match
  for (const country of Object.values(COUNTRIES)) {
    if (country.displayName.toLowerCase() === normalized) {
      return country;
    }
  }
  
  // Then try alternatives
  for (const country of Object.values(COUNTRIES)) {
    if (country.alternatives.some(alt => alt.toLowerCase() === normalized)) {
      return country;
    }
  }
  
  return undefined;
};

/**
 * Get country info by any recognizable name or code
 */
export const getCountryByAnyName = (input: string): CountryInfo | undefined => {
  if (!input) return undefined;
  
  const normalized = input.trim();
  
  // Try ISO2 code first
  if (normalized.length === 2) {
    const byISO2 = getCountryByISO2(normalized);
    if (byISO2) return byISO2;
  }
  
  // Try ISO3 code
  if (normalized.length === 3) {
    for (const country of Object.values(COUNTRIES)) {
      if (country.iso3.toLowerCase() === normalized.toLowerCase()) {
        return country;
      }
    }
  }
  
  // Try display name
  const byDisplayName = getCountryByDisplayName(normalized);
  if (byDisplayName) return byDisplayName;
  
  return undefined;
};

/**
 * Convert any country identifier to ISO2 code
 */
export const toISO2 = (input: string): string | null => {
  const country = getCountryByAnyName(input);
  return country ? country.iso2 : null;
};

/**
 * Convert any country identifier to display name
 */
export const toDisplayName = (input: string): string | null => {
  const country = getCountryByAnyName(input);
  return country ? country.displayName : null;
};

/**
 * Get flag emoji for a country
 */
export const getCountryFlag = (input: string): string => {
  const country = getCountryByAnyName(input);
  return country ? country.flag : '🏳️';
};

/**
 * Get all available ISO2 codes
 */
export const getAvailableISO2Codes = (): string[] => {
  return Object.keys(COUNTRIES);
};

/**
 * Get all available display names
 */
export const getAvailableDisplayNames = (): string[] => {
  return Object.values(COUNTRIES).map(c => c.displayName);
};

/**
 * Validate if a country identifier is valid
 */
export const isValidCountry = (input: string): boolean => {
  return getCountryByAnyName(input) !== undefined;
};

/**
 * Normalize country data in a book object
 * This ensures all country fields use ISO2 codes consistently
 */
export const normalizeBookCountries = (book: any): any => {
  const normalizeCountryArray = (countries: string[]): string[] => {
    if (!Array.isArray(countries)) return [];
    
    return countries
      .map(country => toISO2(country))
      .filter((iso2): iso2 is string => iso2 !== null);
  };
  
  return {
    ...book,
    bookCountries: normalizeCountryArray(book.bookCountries || []),
    authorCountries: normalizeCountryArray(book.authorCountries || [])
  };
};

/**
 * Get country display names for a list of ISO2 codes
 */
export const getCountryDisplayNames = (iso2Codes: string[]): string[] => {
  return iso2Codes
    .map(iso2 => toDisplayName(iso2))
    .filter((name): name is string => name !== null);
};
