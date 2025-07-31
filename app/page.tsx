'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { MapChart } from '../components/MapChart'

const ISBN_COUNTRY_TEST_DATA: Record<string, string[]> = {
  '9789681311889': ['ES'], // e.g. Los renglones torcidos de Dios
}

const TEST_COUNTRIES = ['Egypt', 'Spain', 'Brazil']

type Book = {
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
  const [booksToShow, setBooksToShow] = useState<number>(10)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  // ❶ Build a Set of all countries from your books
  const highlighted = new Set<string>(books.flatMap((b) => b.countries))

  // TEST: pick one mock country per book
  function getMockCountries(): string[] {
    const rand =
      TEST_COUNTRIES[Math.floor(Math.random() * TEST_COUNTRIES.length)]
    return [rand]
  }

  // Filter books based on selected country
  const filteredBooks = selectedCountry
    ? books.filter((book) => book.countries.includes(selectedCountry))
    : books

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        try {
          const readBooks = data.filter(
            (book) =>
              book['Exclusive Shelf']?.toLowerCase() === 'read' ||
              Boolean(book['Date Read'])
          )

          const enriched = readBooks
            .map((book) => ({
              title: book['Title']?.trim() || 'Untitled',
              author: book['Author']?.trim() || 'Unknown',
              isbn13: book['ISBN13']?.trim() || '',
              year: book['Year Published']?.trim() || '',
              readDate: new Date(book['Date Read'] || ''),
              countries: getMockCountries(),
            }))
            .sort((a, b) => b.readDate.getTime() - a.readDate.getTime())

          setBooks(enriched)
          console.table(
            enriched
              .slice(0, 5)
              .map((b) => ({ Title: b.title, ISBN: b.isbn13 }))
          )
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

  // If no books yet, show hero/upload screen
  if (books.length === 0) {
    return (
      <div
        className="relative min-h-screen font-mono overflow-hidden"
        style={{
          backgroundImage: "url('/vintage_world_map.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <div className="text-center max-w-2xl">
            {/* Icon */}
            <div className="w-32 h-32 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-8 border border-gray-300 shadow-lg">
              <svg
                className="w-16 h-16 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Map Your Reading Journey</h1>
            <p className="text-xl text-gray-600 mb-12">
              Upload your reading list to visualize the countries and cultures you’ve explored through literature
            </p>

            {error && (
              <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8 flex items-center gap-4">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <label className="block cursor-pointer">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-10 hover:bg-white/95 transition-all">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-16 px-8 hover:border-gray-400 transition-colors group">
                  <svg className="w-8 h-8 text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0"/>
                  </svg>
                  <p className="text-xl font-semibold text-gray-800 mb-3">Upload your reading list</p>
                  <p className="text-gray-600 mb-8 text-center max-w-md">CSV files from Goodreads, StoryGraph, or similar platforms</p>
                  <div className="bg-gray-900 text-white px-8 py-3 rounded font-medium hover:bg-gray-800 transition-colors">
                    Choose File
                  </div>
                </div>
                <input type="file" accept=".csv" onChange={handleFile} className="sr-only" />
              </div>
            </label>
          </div>
        </div>
      </div>
    )
  }

  // Books loaded layout
  return (
    <div className="min-h-screen bg-gray-50 font-mono">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Your Reading Map</h1>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="h-[calc(100vh-80px)] relative">
        <MapChart
          highlighted={highlighted}
          onCountryClick={setSelectedCountry}
          selectedCountry={selectedCountry}
        />

        {/* Floating Library Sidebar */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 max-h-[calc(100vh-120px)] overflow-auto z-10">
          <h2 className="text-lg font-bold mb-2">Your Library</h2>
          <div className="text-sm text-gray-600 mb-4">
            {selectedCountry
              ? `${filteredBooks.length} books from ${selectedCountry}`
              : `${books.length} books`}
            {selectedCountry && (
              <button
                onClick={() => setSelectedCountry(null)}
                className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Show all
              </button>
            )}
          </div>
          <div className="space-y-4">
            {filteredBooks.slice(0, booksToShow).map((b, i) => (
              <div
                key={`${b.isbn13}-${i}`}
                className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                    repeating-linear-gradient(
                      transparent, transparent 24px,
                      #3b82f6 24px, #3b82f6 25px,
                      transparent 25px, transparent 49px,
                      #dc2626 49px, #dc2626 50px
                    )
                  `,
                  backgroundSize: '100% 100%, 100% 50px',
                  backgroundPosition: '0 0, 0 8px',
                }}
              >
                <div className="absolute left-8 top-0 bottom-0 w-px bg-red-400"></div>
                <div className="ml-6 relative z-10">
                  <p className="font-mono text-gray-900 text-sm leading-tight mb-1">{b.title}</p>
                  <p className="font-mono text-gray-700 text-xs">by {b.author}</p>
                  {b.year && <p className="font-mono text-gray-600 text-xs">{b.year}</p>}
                  {b.countries.length > 0 && (
                    <p className="font-mono text-gray-600 text-xs">Countries: {b.countries[0]}</p>
                  )}
                </div>
              </div>
            ))}
            {filteredBooks.length > booksToShow && (
              <div className="text-center py-4">
                <button
                  onClick={() =>
                    setBooksToShow((prev) => Math.min(prev + 10, filteredBooks.length))
                  }
                  className="bg-gray-900 text-white px-4 py-2 rounded font-medium hover:bg-gray-800 transition-colors text-sm"
                >
                  Load More ({filteredBooks.length - booksToShow} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
