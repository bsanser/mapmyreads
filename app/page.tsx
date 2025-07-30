"use client";

import { useState } from "react";
import Papa from "papaparse";
import { MapChart } from "../components/MapChart";

const ISBN_COUNTRY_TEST_DATA: Record<string, string[]> = {
  // Example ISBNs—replace these with a few books you know are in your CSV // e.g. Harry Potter and the Philosopher's Stone
  "9789681311889": ["ES"], // e.g. Los renglones torcidos de Dios
};

type Book = {
  title: string;
  author: string;
  isbn13: string;
  year: string;
  readDate: Date;
  countries: string[];
};

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string>("");
  const [booksToShow, setBooksToShow] = useState<number>(10);
  // ❶ Build a Set of all countries from your books
  const highlighted = new Set<string>(books.flatMap((b) => b.countries));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        try {
          // 1️⃣ Filter only "read" books: those with the value read in the "Exclusive Shelf" column or a truthy value in the "Date Read" column)
          // To do: Abstract logic of filtering read books into a function that takes the book app platform of origin as an argument (i.e. allow importing books from other platforms such as storygraph)
          const readBooks = data.filter(
            (book) =>
              book["Exclusive Shelf"]?.toLowerCase() === "read" ||
              Boolean(book["Date Read"]),
          );

          // 2️⃣ Map to our Book type
          const enriched = readBooks.map((book) => ({
            title: book["Title"]?.trim() || "Untitled",
            author: book["Author"]?.trim() || "Unknown",
            isbn13: book["ISBN13"]?.trim() || "",
            year: book["Year Published"]?.trim() || "",
            readDate: new Date(book["Date Read"] || ""),
            countries: ISBN_COUNTRY_TEST_DATA[book["ISBN13"]] || [],
          }));

          // 3️⃣ Sort newest first
          enriched.sort((a, b) => b.readDate.getTime() - a.readDate.getTime());

          setBooks(enriched);
          console.table(
            enriched
              .slice(0, 5) // first five books
              .map((b) => ({ Title: b.title, ISBN: b.isbn13 })),
          );
        } catch (err) {
          console.error("Mapping error:", err);
          setError("Could not process CSV—please check its format.");
        }
      },
      error: (err) => {
        console.error("Parse error:", err);
        setError("Failed to read file. Make sure it's a valid CSV.");
      },
    });
  };

  // Show different layouts based on whether books are loaded
  if (books.length === 0) {
    // Hero/Upload layout with background map
    return (
      <div 
        className="relative min-h-screen font-mono overflow-hidden"
        style={{
          backgroundImage: "url('/vintage-world-map.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay content centered in viewport */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          {/* Hero Section */}
          <div className="text-center max-w-2xl">
            <div className="w-32 h-32 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-8 border border-gray-300 shadow-lg">
              <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-6 font-mono">
              📚 Map Your Reading Journey
            </h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed font-mono">
              Upload your reading list to visualize the countries and cultures you've explored through literature
            </p>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8 flex items-center gap-4 font-mono">
                <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* File Upload */}
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-10 hover:bg-white/95 transition-all">
              <label className="block cursor-pointer">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-16 px-8 hover:border-gray-400 transition-colors group">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-6 group-hover:bg-gray-200 transition-colors">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-gray-800 mb-3 font-mono">
                    Upload your reading list
                  </p>
                  <p className="text-gray-600 mb-8 text-center max-w-md font-mono">
                    CSV files from Goodreads, StoryGraph, or similar platforms
                  </p>
                  <div className="bg-gray-900 text-white px-8 py-3 rounded font-medium hover:bg-gray-800 transition-colors font-mono">
                    Choose File
                  </div>
                </div>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFile} 
                  className="sr-only" 
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Books loaded layout - show the app interface
  return (
    <div className="min-h-screen bg-gray-50 font-mono">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 font-mono text-center">
            📚 Your Reading Map
          </h1>
        </div>
      </div>

      {/* Map Section - Full viewport */}
      <div className="h-[calc(100vh-64px)]">
        <div className="bg-gray-50 rounded border border-gray-200 overflow-hidden h-full">
          <MapChart highlighted={highlighted} />
        </div>
      </div>

      {/* Floating Library Sidebar */}
      <div className="fixed top-1/2 left-4 -translate-y-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 max-h-[80vh] overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 font-mono mb-2">
          Your Library
        </h2>
        <div className="text-sm text-gray-600 mb-4">
          {books.length} books
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {books.slice(0, booksToShow).map((b, i) => (
            <div key={`${b.isbn13}-${i}`} className="relative bg-white border border-gray-300 rounded p-4 hover:shadow-md transition-all group shadow-sm overflow-hidden" style={{
              backgroundImage: `
                linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                repeating-linear-gradient(
                  transparent,
                  transparent 24px,
                  #3b82f6 24px,
                  #3b82f6 25px,
                  transparent 25px,
                  transparent 49px,
                  #dc2626 49px,
                  #dc2626 50px
                )
              `,
              backgroundSize: '100% 100%, 100% 50px',
              backgroundPosition: '0 0, 0 8px'
            }}>
              {/* Red margin line */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-red-400"></div>

              {/* Content with proper spacing from margin */}
              <div className="ml-6 relative z-10">
                <div className="mb-3">
                  <p className="font-mono text-gray-900 text-sm leading-tight">
                    {b.title}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-gray-700 text-xs">
                    by {b.author}
                  </p>
                  {b.year && (
                    <p className="font-mono text-gray-600 text-xs">
                      {b.year}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {books.length > booksToShow && (
            <div className="text-center py-4">
              <button
                onClick={() => setBooksToShow(prev => Math.min(prev + 10, books.length))}
                className="bg-gray-900 text-white px-4 py-2 rounded font-medium hover:bg-gray-800 transition-colors font-mono text-sm"
              >
                Load More ({books.length - booksToShow} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}