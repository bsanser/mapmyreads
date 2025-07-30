'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import ReactCountryFlag from 'react-country-flag'
import { MapChart } from '@/components/MapChart'
import { BookList } from '@/components/BookList'

const ISBN_COUNTRY_TEST_DATA: Record<string, string[]> = {
  '9789681311889': ['ES'], // Los renglones torcidos de Dios
}

export type Book = {
  title: string
  author: string
  isbn13: string
  year: string
  readDate: Date
  countries: string[]
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  // parse & enrich
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        try {
          const readRows = data.filter(
            (row) =>
              row['Exclusive Shelf']?.toLowerCase() === 'read' ||
              Boolean(row['Date Read'])
          )

          const enriched = readRows
            .map((row) => ({
              title: row['Title']?.trim() || 'Untitled',
              author: row['Author']?.trim() || 'Unknown',
              isbn13: row['ISBN13']?.trim() || '',
              year: row['Year Published']?.trim() || '',
              readDate: new Date(row['Date Read'] || row['Date Added'] || 0),
              countries: ISBN_COUNTRY_TEST_DATA[row['ISBN13']] || [],
            }))
            .sort((a, b) => b.readDate.getTime() - a.readDate.getTime())

          setBooks(enriched)
        } catch (err) {
          console.error('Mapping error:', err)
          setError('Could not process CSV—please check its format.')
        }
      },
      error: (err) => {
        console.error('Parse error:', err)
        setError('Failed to read file. Make sure it’s a valid CSV.')
      },
    })
  }

  // set of all ISO2 codes to highlight
  const highlighted = new Set(books.flatMap((b) => b.countries))

  // if no books yet, show hero / upload screen
  if (books.length === 0) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('/world-map-old.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold">Map Your Reading Journey</h1>
          <p className="text-gray-700">
            Upload your Goodreads (or similar) CSV to visualize the countries you’ve explored.
          </p>
          {error && (
            <div className="text-red-600 font-medium">{error}</div>
          )}
          <label className="inline-block bg-gray-900 text-white px-6 py-3 rounded cursor-pointer hover:bg-gray-800">
            Choose File
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
        </div>
      </div>
    )
  }

  // main app layout once books are loaded
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
        <BookList books={books} />
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 text-center">
          <h1 className="text-2xl font-bold">Your Reading Map</h1>
        </header>

        {/* Map */}
        <div className="flex-1 p-4 overflow-hidden">
          <MapChart
            highlighted={highlighted}
            onHoverCountry={setSelectedCountry}
            onClickCountry={setSelectedCountry}
          />
        </div>

        {/* Tooltip */}
        {selectedCountry && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="flex items-center text-xl font-semibold mb-2">
              <ReactCountryFlag
                countryCode={selectedCountry}
                svg
                style={{ width: '1.5em', marginRight: '0.5em' }}
              />
              {selectedCountry}
            </h2>
            <ul className="list-disc pl-6 space-y-1 max-h-48 overflow-y-auto">
              {books
                .filter((b) => b.countries.includes(selectedCountry))
                .map((b, i) => (
                  <li key={`${b.isbn13}-${i}`}>
                    {b.title} by {b.author} ({b.year || 'N/A'})
                  </li>
                ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
