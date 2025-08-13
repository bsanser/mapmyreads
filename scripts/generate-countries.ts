#!/usr/bin/env tsx

import { countries } from 'country-code-lookup';
import * as fs from 'fs';
import * as path from 'path';

interface Country {
  name: string;
  iso2: string;
  iso3: string;
  alternatives: string[];
}

// Generate country data with alternatives
const generateCountries = (): Country[] => {
  return countries.map(country => {
    const alternatives: string[] = [];
    
    // Add common alternatives
    if (country.country === 'United States') {
      alternatives.push('USA', 'America', 'United States of America');
    } else if (country.country === 'United Kingdom') {
      alternatives.push('UK', 'England', 'Britain', 'Great Britain');
    } else if (country.country === 'Czech Republic') {
      alternatives.push('Czechia');
    } else if (country.country === 'Democratic Republic of the Congo') {
      alternatives.push('DR Congo', 'DRC', 'Congo-Kinshasa');
    } else if (country.country === 'Central African Republic') {
      alternatives.push('CAR');
    } else if (country.country === 'Equatorial Guinea') {
      alternatives.push('Eq. Guinea');
    } else if (country.country === 'Bosnia and Herzegovina') {
      alternatives.push('Bosnia', 'Bosnia-Herzegovina');
    } else if (country.country === 'North Macedonia') {
      alternatives.push('Macedonia');
    } else if (country.country === 'Eswatini') {
      alternatives.push('Swaziland');
    } else if (country.country === 'South Sudan') {
      alternatives.push('S. Sudan');
    }
    
    return {
      name: country.country,
      iso2: country.iso2,
      iso3: country.iso3,
      alternatives
    };
  });
};

// Generate the TypeScript file content
const generateTypeScriptContent = (countries: Country[]): string => {
  return `// Auto-generated country data - DO NOT EDIT MANUALLY
// Run 'npm run generate-countries' to update

export interface Country {
  name: string;
  iso2: string;
  iso3: string;
  alternatives: string[];
}

export const COUNTRIES: Country[] = ${JSON.stringify(countries, null, 2)};

// Utility functions
export const getCountryByIso2 = (iso2: string): Country | undefined => {
  return COUNTRIES.find(c => c.iso2 === iso2.toUpperCase());
};

export const getCountryByIso3 = (iso3: string): Country | undefined => {
  return COUNTRIES.find(c => c.iso3 === iso3.toUpperCase());
};

export const getCountryByName = (name: string): Country | undefined => {
  const normalizedName = name.trim();
  return COUNTRIES.find(c => 
    c.name.toLowerCase() === normalizedName.toLowerCase() ||
    c.alternatives.some(alt => alt.toLowerCase() === normalizedName.toLowerCase())
  );
};

export const getCountryIso2 = (name: string): string | undefined => {
  const country = getCountryByName(name);
  return country?.iso2;
};

export const getCountryIso3 = (name: string): string | undefined => {
  const country = getCountryByName(name);
  return country?.iso3;
};

export const getAllCountryNames = (): string[] => {
  return COUNTRIES.map(c => c.name);
};

export const getAllIso2Codes = (): string[] => {
  return COUNTRIES.map(c => c.iso2);
};
`;
};

// Main execution
const main = () => {
  try {
    console.log('🌍 Generating country database...');
    
    const countries = generateCountries();
    const outputPath = path.join(__dirname, '..', 'lib', 'countries.ts');
    const content = generateTypeScriptContent(countries);
    
    // Ensure lib directory exists
    const libDir = path.dirname(outputPath);
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, content);
    
    console.log(`✅ Generated ${countries.length} countries in ${outputPath}`);
    console.log(`📊 Sample countries:`);
    countries.slice(0, 5).forEach(c => {
      console.log(`   ${c.name} (${c.iso2}/${c.iso3}) - Alternatives: ${c.alternatives.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating countries:', error);
    process.exit(1);
  }
};

main();
