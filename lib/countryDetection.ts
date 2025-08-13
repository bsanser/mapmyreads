// Country detection for books and authors
import { Book } from '../types/book'

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

// Common country keywords and their mappings
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  'United States': ['america', 'usa', 'united states', 'new york', 'california', 'texas', 'chicago', 'los angeles', 'boston', 'washington', 'florida', 'alaska', 'hawaii'],
  'United Kingdom': ['england', 'britain', 'uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'scotland', 'wales', 'northern ireland', 'edinburgh', 'glasgow'],
  'France': ['france', 'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'bordeaux', 'nantes'],
  'Germany': ['germany', 'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt', 'stuttgart', 'düsseldorf'],
  'Spain': ['spain', 'madrid', 'barcelona', 'valencia', 'seville', 'bilbao', 'malaga'],
  'Italy': ['italy', 'rome', 'milan', 'naples', 'turin', 'palermo', 'genoa', 'bologna'],
  'Japan': ['japan', 'tokyo', 'osaka', 'kyoto', 'yokohama', 'nagoya', 'sapporo', 'kobe'],
  'China': ['china', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'tianjin', 'chongqing'],
  'India': ['india', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune'],
  'Brazil': ['brazil', 'são paulo', 'rio de janeiro', 'salvador', 'brasília', 'fortaleza', 'belo horizonte'],
  'Mexico': ['mexico', 'mexico city', 'guadalajara', 'monterrey', 'puebla', 'tijuana', 'leon'],
  'Canada': ['canada', 'toronto', 'montreal', 'vancouver', 'calgary', 'edmonton', 'ottawa'],
  'Australia': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra'],
  'Russia': ['russia', 'moscow', 'saint petersburg', 'novosibirsk', 'yekaterinburg', 'kazan'],
  'South Korea': ['korea', 'south korea', 'seoul', 'busan', 'incheon', 'daegu', 'daejeon'],
  'Netherlands': ['netherlands', 'holland', 'amsterdam', 'rotterdam', 'the hague', 'utrecht', 'eindhoven'],
  'Sweden': ['sweden', 'stockholm', 'gothenburg', 'malmö', 'uppsala', 'västerås', 'örebro'],
  'Norway': ['norway', 'oslo', 'bergen', 'trondheim', 'stavanger', 'drammen', 'fredrikstad'],
  'Denmark': ['denmark', 'copenhagen', 'aarhus', 'odense', 'aalborg', 'esbjerg', 'randers'],
  'Finland': ['finland', 'helsinki', 'espoo', 'tampere', 'vantaa', 'oulu', 'turku'],
  'Poland': ['poland', 'warsaw', 'kraków', 'łódź', 'wrocław', 'poznań', 'gdańsk'],
  'Czech Republic': ['czech republic', 'czechia', 'prague', 'brno', 'ostrava', 'plzeň', 'liberec'],
  'Hungary': ['hungary', 'budapest', 'debrecen', 'szeged', 'miskolc', 'pécs', 'győr'],
  'Romania': ['romania', 'bucharest', 'cluj-napoca', 'timișoara', 'iași', 'constanța', 'craiova'],
  'Bulgaria': ['bulgaria', 'sofia', 'plovdiv', 'varna', 'burgas', 'ruse', 'stara zagora'],
  'Greece': ['greece', 'athens', 'thessaloniki', 'patras', 'piraeus', 'larissa', 'heraklion'],
  'Turkey': ['turkey', 'istanbul', 'ankara', 'izmir', 'bursa', 'antalya', 'adana'],
  'Egypt': ['egypt', 'cairo', 'alexandria', 'giza', 'shubra el kheima', 'port said', 'suez'],
  'South Africa': ['south africa', 'johannesburg', 'cape town', 'durban', 'pretoria', 'port elizabeth', 'bloemfontein'],
  'Nigeria': ['nigeria', 'lagos', 'kano', 'ibadan', 'kaduna', 'port harcourt', 'benin city'],
  'Kenya': ['kenya', 'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika'],
  'Morocco': ['morocco', 'casablanca', 'rabat', 'fes', 'marrakech', 'agadir', 'tangier'],
  'Algeria': ['algeria', 'algiers', 'oran', 'constantine', 'annaba', 'batna', 'blida'],
  'Tunisia': ['tunisia', 'tunis', 'sfax', 'sousse', 'kairouan', 'bizerte', 'gabès'],
  'Libya': ['libya', 'tripoli', 'benghazi', 'misrata', 'tarhuna', 'al khums', 'zawiya'],
  'Sudan': ['sudan', 'khartoum', 'omdurman', 'port sudan', 'kassala', 'el obeid', 'nyala'],
  'Ethiopia': ['ethiopia', 'addis ababa', 'dire dawa', 'mekelle', 'gondar', 'bahir dar', 'awasa'],
  'Tanzania': ['tanzania', 'dar es salaam', 'mwanza', 'arusha', 'dodoma', 'mbeya', 'morogoro'],
  'Uganda': ['uganda', 'kampala', 'gulu', 'mbarara', 'jinja', 'mbale', 'masaka'],
  'Ghana': ['ghana', 'accra', 'kumasi', 'tamale', 'sekondi-takoradi', 'ashaiman', 'sunyani'],
  'Senegal': ['senegal', 'dakar', 'touba', 'thies', 'kaolack', 'mbour', 'saint-louis'],
  'Mali': ['mali', 'bamako', 'sikasso', 'mopti', 'koutiala', 'ségou', 'gao'],
  'Burkina Faso': ['burkina faso', 'ouagadougou', 'bobo-dioulasso', 'koudougou', 'ouahigouya', 'banfora', 'dédougou'],
  'Niger': ['niger', 'niamey', 'zinder', 'maradi', 'agadez', 'tahoua', 'dosso'],
  'Chad': ['chad', 'n\'djamena', 'moundou', 'sarah', 'abéché', 'kelo', 'koumra'],
  'Cameroon': ['cameroon', 'douala', 'yaoundé', 'garoua', 'bamenda', 'maroua', 'bafoussam'],
  'Central African Republic': ['central african republic', 'bangui', 'bimbo', 'berbérati', 'carnot', 'bambari', 'bouar'],
  'Gabon': ['gabon', 'libreville', 'port-gentil', 'franceville', 'oyem', 'moanda', 'lambarene'],
  'Congo': ['congo', 'brazzaville', 'pointe-noire', 'dolisie', 'nkayi', 'ouesso', 'impfondo'],
  'Democratic Republic of the Congo': ['democratic republic of the congo', 'kinshasa', 'lubumbashi', 'mbuji-mayi', 'kananga', 'kisangani', 'bukavu'],
  'Angola': ['angola', 'luanda', 'huambo', 'lobito', 'benguela', 'kuito', 'lubango'],
  'Zambia': ['zambia', 'lusaka', 'kitwe', 'ndola', 'kabwe', 'chililabombwe', 'mufulira'],
  'Zimbabwe': ['zimbabwe', 'harare', 'bulawayo', 'chitungwiza', 'mutare', 'epworth', 'gweru'],
  'Botswana': ['botswana', 'gaborone', 'francistown', 'molepolole', 'selebi-phikwe', 'maun', 'serowe'],
  'Namibia': ['namibia', 'windhoek', 'walvis bay', 'oshakati', 'swakopmund', 'katima mulilo', 'otjiwarongo'],
  'Lesotho': ['lesotho', 'maseru', 'teyateyaneng', 'mohale\'s hoek', 'mafeteng', 'quthing', 'qacha\'s nek'],
  'Eswatini': ['eswatini', 'mbabane', 'manzini', 'big bend', 'malkerns', 'ezulwini', 'hlane'],
  'Madagascar': ['madagascar', 'antananarivo', 'toamasina', 'antsirabe', 'mahajanga', 'fianarantsoa', 'toliara'],
  'Mauritius': ['mauritius', 'port louis', 'beau bassin-rose hill', 'vacoas-phoenix', 'curepipe', 'quatre bornes', 'triolet'],
  'Seychelles': ['seychelles', 'victoria', 'anse boileau', 'anse royale', 'cascade', 'takamaka', 'port glaud'],
  'Comoros': ['comoros', 'moroni', 'mutsamudu', 'fomboni', 'domoni', 'tsémbéhou', 'mitsoudjé'],
  'Cape Verde': ['cape verde', 'praia', 'mindelo', 'santa maria', 'assomada', 'porto novo', 'pedra badejo'],
  'São Tomé and Príncipe': ['são tomé and príncipe', 'são tomé', 'santo antónio', 'neves', 'santana', 'trindade', 'guadalupe'],
  'Equatorial Guinea': ['equatorial guinea', 'malabo', 'bata', 'ebebiyin', 'aconibe', 'añisoc', 'luba'],
  'Guinea-Bissau': ['guinea-bissau', 'bissau', 'bafatá', 'gabú', 'bissorã', 'bolama', 'cacheu'],
  'The Gambia': ['the gambia', 'banjul', 'serrekunda', 'brikama', 'bakau', 'farafenni', 'lamin'],
  'Mauritania': ['mauritania', 'nouakchott', 'nouadhibou', 'kaédi', 'kiffa', 'zouérat', 'roso'],
  'Djibouti': ['djibouti', 'djibouti city', 'ali sabieh', 'tadjourah', 'obock', 'dikhil', 'arta'],
  'Eritrea': ['eritrea', 'asmara', 'keren', 'massawa', 'assab', 'mendefera', 'barentu'],
  'Somalia': ['somalia', 'mogadishu', 'hargeisa', 'bosaso', 'kismayo', 'berbera', 'marka'],
  'Burundi': ['burundi', 'bujumbura', 'gitega', 'muyinga', 'ngozi', 'rutana', 'bururi'],
  'Rwanda': ['rwanda', 'kigali', 'butare', 'gitarama', 'ruhengeri', 'gisenyi', 'byumba'],
  'Malawi': ['malawi', 'lilongwe', 'blantyre', 'mzuzu', 'zomba', 'kasungu', 'mangochi'],
  'Mozambique': ['mozambique', 'maputo', 'matola', 'beira', 'nampula', 'chimoio', 'naçala'],
  'Cuba': ['cuba', 'havana', 'santiago de cuba', 'camagüey', 'holguín', 'santa clara', 'guantánamo'],
  'Jamaica': ['jamaica', 'kingston', 'montego bay', 'spanish town', 'portmore', 'may pen', 'mandeville'],
  'Haiti': ['haiti', 'port-au-prince', 'cap-haïtien', 'gonaïves', 'les cayes', 'port-de-paix', 'jérémie'],
  'Dominican Republic': ['dominican republic', 'santo domingo', 'santiago', 'la romana', 'san pedro de macorís', 'san francisco de macorís', 'la vega'],
  'Puerto Rico': ['puerto rico', 'san juan', 'bayamón', 'carolina', 'ponce', 'caguas', 'guaynabo'],
  'Trinidad and Tobago': ['trinidad and tobago', 'port of spain', 'san fernando', 'arima', 'point fortin', 'scarborough', 'tobago'],
  'Barbados': ['barbados', 'bridgetown', 'speightstown', 'oistins', 'bathsheba', 'holetown', 'warrens'],
  'Grenada': ['grenada', 'saint george\'s', 'gouyave', 'grenville', 'hillsborough', 'sauteurs', 'woburn'],
  'Saint Vincent and the Grenadines': ['saint vincent and the grenadines', 'kingstown', 'arrouca', 'layou', 'barrouallie', 'georgetown', 'port elizabeth'],
  'Saint Lucia': ['saint lucia', 'castries', 'vieux fort', 'micoud', 'dennery', 'soufrière', 'anse la raye'],
  'Dominica': ['dominica', 'roseau', 'portsmouth', 'marigot', 'grand bay', 'la plaine', 'wesley'],
  'Antigua and Barbuda': ['antigua and barbuda', 'saint john\'s', 'all saints', 'liberta', 'potter\'s village', 'bolans', 'swetes'],
  'Saint Kitts and Nevis': ['saint kitts and nevis', 'basseterre', 'sandy point town', 'cayon', 'monkey hill', 'saint paul\'s', 'fig tree'],
  'Bahamas': ['bahamas', 'nassau', 'freeport', 'west end', 'coopers town', 'san andros', 'george town'],
  'Belize': ['belize', 'belize city', 'belmopan', 'san ignacio', 'orange walk', 'san pedro', 'corozal'],
  'Guatemala': ['guatemala', 'guatemala city', 'mixco', 'villa nueva', 'petapa', 'san juan sacatepéquez', 'quetzaltenango'],
  'El Salvador': ['el salvador', 'san salvador', 'santa ana', 'san miguel', 'mejicanos', 'soyapango', 'apopa'],
  'Honduras': ['honduras', 'tegucigalpa', 'san pedro sula', 'choloma', 'la ceiba', 'el progreso', 'comayagua'],
  'Nicaragua': ['nicaragua', 'managua', 'león', 'masaya', 'tipitapa', 'chinandega', 'matagalpa'],
  'Costa Rica': ['costa rica', 'san josé', 'limón', 'san francisco', 'alajuela', 'liberia', 'paraiso'],
  'Panama': ['panama', 'panama city', 'san miguelito', 'juan díaz', 'david', 'arraiján', 'colón'],
  'Greenland': ['greenland', 'nuuk', 'sisimiut', 'ilulissat', 'qaqortoq', 'aasiaat', 'maniitsoq'],
  'Faroe Islands': ['faroe islands', 'tórshavn', 'klaksvík', 'runavík', 'tvøroyri', 'fuglafjørður', 'vágur'],
  'Andorra': ['andorra', 'andorra la vella', 'les escaldes', 'encamp', 'sant julià de lòria', 'la massana', 'ordino'],
  'Liechtenstein': ['liechtenstein', 'vaduz', 'schaan', 'triesen', 'balzers', 'eschen', 'mauren'],
  'Monaco': ['monaco', 'monte carlo', 'la condamine', 'fontvieille', 'monaco-ville', 'saint-michel', 'la colle'],
  'San Marino': ['san marino', 'city of san marino', 'serravalle', 'borgo maggiore', 'domagnano', 'fiorentino', 'acquaviva'],
  'Vatican City': ['vatican city', 'vatican', 'holy see'],
  'Malta': ['malta', 'valletta', 'birkirkara', 'mosta', 'qormi', 'żabbar', 'sliema'],
  'Cyprus': ['cyprus', 'nicosia', 'limassol', 'larnaca', 'paphos', 'famagusta', 'kyrenia'],
  'Luxembourg': ['luxembourg', 'luxembourg city', 'esch-sur-alzette', 'differdange', 'dudelange', 'ettelbruck', 'diekirch']
}

// Author nationality keywords
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

// Detect countries from text using keyword matching
export const detectCountriesFromText = (text: string): string[] => {
  if (!text) return []
  
  const normalizedText = text.toLowerCase()
  const detectedCountries = new Set<string>()
  
  // Check for country keywords
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        detectedCountries.add(country)
        break
      }
    }
  }
  
  return Array.from(detectedCountries)
}

// Detect author nationality from text
export const detectAuthorNationality = (text: string): string[] => {
  if (!text) return []
  
  const normalizedText = text.toLowerCase()
  const detectedCountries = new Set<string>()
  
  // Check for nationality keywords
  for (const [country, keywords] of Object.entries(AUTHOR_NATIONALITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        detectedCountries.add(country)
        break
      }
    }
  }
  
  return Array.from(detectedCountries)
}

// Enhanced country detection for books
export const detectBookCountries = async (book: Book): Promise<string[]> => {
  const detectedCountries = new Set<string>()
  
  // Strategy 1: Check book title for country references
  const titleCountries = detectCountriesFromText(book.title)
  titleCountries.forEach(country => detectedCountries.add(country))
  
  // Strategy 2: Check subtitle for country references
  if (book.subtitle) {
    const subtitleCountries = detectCountriesFromText(book.subtitle)
    subtitleCountries.forEach(country => detectedCountries.add(country))
  }
  
  // Strategy 3: Check description for country references
  if (book.description) {
    const descCountries = detectCountriesFromText(book.description)
    descCountries.forEach(country => detectedCountries.add(country))
  }
  
  // Strategy 4: Check publisher for country hints
  if (book.publisher) {
    const publisherCountries = detectCountriesFromText(book.publisher)
    publisherCountries.forEach(country => detectedCountries.add(country))
  }
  
  // Strategy 5: Use Google Books API for additional metadata (if we don't have the data yet)
  if (book.isbn13 && (!book.description && !book.subtitle && !book.publisher)) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn13}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.items && data.items.length > 0) {
          const volumeInfo = data.items[0].volumeInfo
          
          // Check description for country references
          if (volumeInfo.description) {
            const descCountries = detectCountriesFromText(volumeInfo.description)
            descCountries.forEach(country => detectedCountries.add(country))
          }
          
          // Check categories for location hints
          if (volumeInfo.categories) {
            const categoriesText = volumeInfo.categories.join(' ')
            const catCountries = detectCountriesFromText(categoriesText)
            catCountries.forEach(country => detectedCountries.add(country))
          }
          
          // Check subtitle for country references
          if (volumeInfo.subtitle) {
            const subtitleCountries = detectCountriesFromText(volumeInfo.subtitle)
            subtitleCountries.forEach(country => detectedCountries.add(country))
          }
          
          // Check publisher for country hints
          if (volumeInfo.publisher) {
            const publisherCountries = detectCountriesFromText(volumeInfo.publisher)
            publisherCountries.forEach(country => detectedCountries.add(country))
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching book metadata for country detection:', error)
    }
  }
  
  return Array.from(detectedCountries)
}

// Enhanced author country detection
export const detectAuthorCountries = async (book: Book): Promise<string[]> => {
  const detectedCountries = new Set<string>()
  
  // Strategy 1: Check description for author nationality
  if (book.description) {
    const descAuthorCountries = detectAuthorNationality(book.description)
    descAuthorCountries.forEach(country => detectedCountries.add(country))
  }
  
  // Strategy 2: Use Google Books API for author information (if we don't have description yet)
  if (book.isbn13 && !book.description) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn13}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.items && data.items.length > 0) {
          const volumeInfo = data.items[0].volumeInfo
          
          // Check description for author nationality
          if (volumeInfo.description) {
            const descAuthorCountries = detectAuthorNationality(volumeInfo.description)
            descAuthorCountries.forEach(country => detectedCountries.add(country))
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching author metadata for country detection:', error)
    }
  }
  
  return Array.from(detectedCountries)
}

// Main function to detect both book and author countries
export const detectCountriesForBook = async (book: Book): Promise<{
  bookCountries: string[]
  authorCountries: string[]
}> => {
  const [bookCountries, authorCountries] = await Promise.all([
    detectBookCountries(book),
    detectAuthorCountries(book)
  ])
  
  return {
    bookCountries,
    authorCountries
  }
} 