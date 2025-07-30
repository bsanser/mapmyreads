"use client";

import { useState } from "react";
import Papa from "papaparse";
import ReactCountryFlag from "react-country-flag";
import { MapChart } from "./../components/MapChart";

const ISBN_COUNTRY_TEST_DATA: Record<string, string[]> = {
  // Example ISBNs—replace these with a few books you know are in your CSV // e.g. Harry Potter and the Philosopher’s Stone
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            📚 MapMyReads
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        {books.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Map Your Reading Journey
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Upload your reading list to visualize the countries and cultures you've explored through literature
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* File Upload - Hidden after successful upload */}
        {books.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <label className="block">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-12 px-6 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group">
                <svg className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-700 group-hover:text-blue-600 transition-colors mb-2">
                  Upload your reading list
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  CSV files from Goodreads, StoryGraph, or similar platforms
                </p>
                <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium group-hover:bg-blue-700 transition-colors">
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
        )}

        {/* Content Grid */}
        {books.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Book List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Library
                </h2>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  {books.length} books
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {books.slice(0, 10).map((b, i) => (
                  <div key={`${b.isbn13}-${i}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{b.title}</p>
                      <p className="text-sm text-gray-600">by {b.author}</p>
                      {b.year && (
                        <p className="text-xs text-gray-500">{b.year}</p>
                      )}
                    </div>
                  </div>
                ))}
                {books.length > 10 && (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-500">
                      +{books.length - 10} more books
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Map Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Your Reading Map
              </h2>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <MapChart highlighted={highlighted} />
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                  <span>Countries explored</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
                  <span>Unexplored</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}