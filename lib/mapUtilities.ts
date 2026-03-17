import { COUNTRIES } from './countries';

// Map display names back to ISO2 codes
export const mapDisplayNameToISO2 = (displayName: string): string => {
  const country = COUNTRIES.find(c =>
    c.name.toLowerCase() === displayName.toLowerCase() ||
    c.alternatives.some(alt => alt.toLowerCase() === displayName.toLowerCase())
  );
  return country ? country.iso2 : displayName;
};

// Map ISO2 codes to display names
export const mapISO2ToDisplayName = (iso2: string): string => {
  const country = COUNTRIES.find(c => c.iso2 === iso2);
  return country ? country.name : iso2;
};

// Get country flag emoji from ISO2 code
export const getCountryFlag = (iso2: string): string => {
  // Generate flag emoji from ISO2 code
  // Convert ISO2 to regional indicator symbols (A-Z = 127462-127487)
  const codePoints = iso2.toUpperCase().split('').map(char =>
    127462 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
};
