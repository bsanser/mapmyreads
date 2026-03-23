// Country detection for books and authors
import * as Sentry from '@sentry/nextjs'
import { Book } from '../types/book'
import { splitAuthorNames, normalizeAuthorName } from './authorUtils'
import { mapDisplayNameToISO2 } from './mapUtilities'

// Country name mapping for map display
const COUNTRY_NAME_MAPPING: Record<string, string> = {
  'United States': 'United States of America',
  'Czech Republic': 'Czechia',
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  'Central African Republic': 'Central African Rep.',
  'Equatorial Guinea': 'Eq. Guinea',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'North Macedonia': 'Macedonia',
  'Eswatini': 'eSwatini',
  'South Sudan': 'S. Sudan'
}

// Map country detection names to map display names
export const mapCountryNameForDisplay = (countryName: string): string => {
  return COUNTRY_NAME_MAPPING[countryName] || countryName
}

// Reverse mapping from map display names to country detection names
export const mapDisplayNameToCountry = (displayName: string): string => {
  const reverseMapping = Object.fromEntries(
    Object.entries(COUNTRY_NAME_MAPPING).map(([key, value]) => [value, key])
  )
  return reverseMapping[displayName] || displayName
}

// Author nationality keywords (kept for backward compat with testCountryDetection debug tool)
const AUTHOR_NATIONALITY_KEYWORDS: Record<string, string[]> = {
  'United States': ['american', 'usa', 'united states'],
  'United Kingdom': ['british', 'english', 'scottish', 'welsh', 'northern irish', 'uk'],
  'France': ['french'],
  'Germany': ['german'],
  'Spain': ['spanish'],
  'Italy': ['italian'],
  'Japan': ['japanese'],
  'China': ['chinese'],
  'India': ['indian'],
  'Brazil': ['brazilian'],
  'Mexico': ['mexican'],
  'Canada': ['canadian'],
  'Australia': ['australian'],
  'Russia': ['russian'],
  'South Korea': ['korean'],
  'Netherlands': ['dutch', 'netherlands'],
  'Sweden': ['swedish'],
  'Norway': ['norwegian'],
  'Denmark': ['danish'],
  'Finland': ['finnish'],
  'Poland': ['polish'],
  'Czech Republic': ['czech'],
  'Hungary': ['hungarian'],
  'Romania': ['romanian'],
  'Bulgaria': ['bulgarian'],
  'Greece': ['greek'],
  'Turkey': ['turkish'],
  'Egypt': ['egyptian'],
  'South Africa': ['south african'],
  'Nigeria': ['nigerian'],
  'Kenya': ['kenyan'],
  'Morocco': ['moroccan'],
  'Algeria': ['algerian'],
  'Tunisia': ['tunisian'],
  'Libya': ['libyan'],
  'Sudan': ['sudanese'],
  'Ethiopia': ['ethiopian'],
  'Tanzania': ['tanzanian'],
  'Uganda': ['ugandan'],
  'Ghana': ['ghanaian'],
  'Senegal': ['senegalese'],
  'Mali': ['malian'],
  'Burkina Faso': ['burkinabé'],
  'Niger': ['nigerien'],
  'Chad': ['chadian'],
  'Cameroon': ['cameroonian'],
  'Central African Republic': ['central african'],
  'Gabon': ['gabonese'],
  'Congo': ['congolese'],
  'Democratic Republic of the Congo': ['congolese'],
  'Angola': ['angolan'],
  'Zambia': ['zambian'],
  'Zimbabwe': ['zimbabwean'],
  'Botswana': ['botswanan'],
  'Namibia': ['namibian'],
  'Lesotho': ['basotho'],
  'Eswatini': ['swazi'],
  'Madagascar': ['malagasy'],
  'Mauritius': ['mauritian'],
  'Seychelles': ['seychellois'],
  'Comoros': ['comorian'],
  'Cape Verde': ['cape verdean'],
  'São Tomé and Príncipe': ['são toméan'],
  'Equatorial Guinea': ['equatorial guinean'],
  'Guinea-Bissau': ['guinea-bissauan'],
  'The Gambia': ['gambian'],
  'Mauritania': ['mauritanian'],
  'Djibouti': ['djiboutian'],
  'Eritrea': ['eritrean'],
  'Somalia': ['somali'],
  'Burundi': ['burundian'],
  'Rwanda': ['rwandan'],
  'Malawi': ['malawian'],
  'Mozambique': ['mozambican'],
  'Cuba': ['cuban'],
  'Jamaica': ['jamaican'],
  'Haiti': ['haitian'],
  'Dominican Republic': ['dominican'],
  'Puerto Rico': ['puerto rican'],
  'Trinidad and Tobago': ['trinidadian', 'tobagonian'],
  'Barbados': ['barbadian'],
  'Grenada': ['grenadian'],
  'Saint Vincent and the Grenadines': ['saint vincentian'],
  'Saint Lucia': ['saint lucian'],
  'Dominica': ['dominican'],
  'Antigua and Barbuda': ['antiguan', 'barbudan'],
  'Saint Kitts and Nevis': ['kittitian', 'nevisian'],
  'Bahamas': ['bahamian'],
  'Belize': ['belizean'],
  'Guatemala': ['guatemalan'],
  'El Salvador': ['salvadoran'],
  'Honduras': ['honduran'],
  'Nicaragua': ['nicaraguan'],
  'Costa Rica': ['costa rican'],
  'Panama': ['panamanian'],
  'Greenland': ['greenlandic'],
  'Faroe Islands': ['faroese'],
  'Andorra': ['andorran'],
  'Liechtenstein': ['liechtensteiner'],
  'Monaco': ['monacan'],
  'San Marino': ['sammarinese'],
  'Vatican City': ['vatican'],
  'Malta': ['maltese'],
  'Cyprus': ['cypriot'],
  'Luxembourg': ['luxembourger']
}

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

const buildWikidataURL = (params: Record<string, string>) => {
  const searchParams = new URLSearchParams({
    origin: '*',
    ...params
  })
  return `${WIKIDATA_API}?${searchParams.toString()}`
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    const err = new Error(`Wikidata request failed: ${response.status}`) as any
    err.status = response.status
    throw err
  }
  return response.json()
}

const searchAuthorEntityId = async (authorName: string): Promise<{ id: string; description?: string } | null> => {
  const url = buildWikidataURL({
    action: 'wbsearchentities',
    search: authorName,
    language: 'en',
    format: 'json',
    type: 'item',
    limit: '1'
  })

  const data: any = await fetchJson(url)
  const result = data?.search?.[0]
  if (!result?.id) return null
  return { id: result.id, description: result.description }
}

const extractIdsFromClaims = (claims: any, property: string): string[] => {
  if (!claims || !claims[property]) return []
  return claims[property]
    .map((claim: any) => claim?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean)
}

const fetchClaimsForEntities = async (entityIds: string[]): Promise<Record<string, any>> => {
  if (entityIds.length === 0) return {}
  const url = buildWikidataURL({
    action: 'wbgetentities',
    ids: entityIds.join('|'),
    props: 'claims',
    format: 'json'
  })
  const data: any = await fetchJson(url)
  return data.entities || {}
}

const fetchLabelsForEntities = async (entityIds: string[]): Promise<string[]> => {
  if (entityIds.length === 0) return []
  const url = buildWikidataURL({
    action: 'wbgetentities',
    ids: entityIds.join('|'),
    props: 'labels',
    languages: 'en',
    format: 'json'
  })
  const data: any = await fetchJson(url)
  const labels: string[] = []
  entityIds.forEach(id => {
    const label = data.entities?.[id]?.labels?.en?.value
    if (label) labels.push(label)
  })
  return labels
}

const fetchCountryIdsFromBirthPlaces = async (placeIds: string[]): Promise<string[]> => {
  if (placeIds.length === 0) return []
  const entities = await fetchClaimsForEntities(placeIds)
  const ids = new Set<string>()
  placeIds.forEach(placeId => {
    const placeClaims = entities?.[placeId]?.claims
    const countryIds = extractIdsFromClaims(placeClaims, 'P17')
    countryIds.forEach((id: string) => ids.add(id))
  })
  return Array.from(ids)
}

const extractCountryFromDescription = (description: string): string[] => {
  if (!description) return []
  const lower = description.toLowerCase()
  const countries: string[] = []
  for (const [country, keywords] of Object.entries(AUTHOR_NATIONALITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (new RegExp(`\\b${keyword}\\b`).test(lower)) {
        countries.push(country)
        break
      }
    }
  }
  return countries
}

const fetchAuthorCountryNames = async (authorName: string): Promise<string[]> => {
  try {
    const result = await searchAuthorEntityId(authorName)
    if (!result) return []
    const { id: entityId, description } = result

    // Fast path: extract nationality from description (e.g. "American novelist") — skips 3 API calls
    if (description) {
      const fromDescription = extractCountryFromDescription(description)
      if (fromDescription.length > 0) return fromDescription
    }

    const entities = await fetchClaimsForEntities([entityId])
    const claims = entities[entityId]?.claims
    if (!claims) return []

    let countryIds = extractIdsFromClaims(claims, 'P27')

    if (countryIds.length === 0) {
      const birthPlaceIds = extractIdsFromClaims(claims, 'P19')
      if (birthPlaceIds.length > 0) {
        countryIds = await fetchCountryIdsFromBirthPlaces(birthPlaceIds)
      }
    }

    if (countryIds.length === 0) return []

    return await fetchLabelsForEntities(countryIds)
  } catch (error: any) {
    if (error?.status === 429) {
      Sentry.captureMessage('wikidata_rate_limited', 'warning' as any, {
        extra: { concurrent_limit: 2, delay_ms: 150 }
      })
    } else {
      Sentry.captureException(error, {
        tags: { component: 'wikidata', failure_type: error?.status ? 'api_error' : 'unknown' },
        extra: { http_status: error?.status }
      })
    }
    return []
  }
}

const authorCountryIsoCache = new Map<string, string[]>()

export const detectAuthorCountriesByName = async (authorName: string): Promise<string[]> => {
  const normalized = normalizeAuthorName(authorName)
  if (!normalized) return []

  if (authorCountryIsoCache.has(normalized)) {
    return authorCountryIsoCache.get(normalized) || []
  }

  const countryNames = await fetchAuthorCountryNames(authorName)
  const isoCodes = Array.from(
    new Set(
      countryNames
        .map(name => mapDisplayNameToISO2(name))
        .filter(Boolean)
    )
  )

  authorCountryIsoCache.set(normalized, isoCodes)
  return isoCodes
}

// Enhanced author country detection
export const detectAuthorCountries = async (book: Book): Promise<string[]> => {
  const detectedCountries = new Set<string>()
  const authorNames = splitAuthorNames(book.authors)
  
  for (const authorName of authorNames) {
    const countries = await detectAuthorCountriesByName(authorName)
    countries.forEach(country => detectedCountries.add(country))
  }
  
  return Array.from(detectedCountries).filter(Boolean)
}
