
"use client";

import { useState } from "react";
import Papa from "papaparse";
import ReactCountryFlag from "react-country-flag";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-cyan-400/10"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/40 border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-black/5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <span className="text-3xl">📚</span> MapMyReads
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        {/* Hero Section */}
        {books.length === 0 && (
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/10 border border-white/30">
              <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-6">
              Map Your Reading Journey
            </h2>
            <p className="text-xl text-gray-600/80 mb-12 max-w-2xl mx-auto leading-relaxed">
              Upload your reading list to visualize the countries and cultures you've explored through literature
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/10 border border-red-200/30 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-4 shadow-lg shadow-red-500/5">
            <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* File Upload - Hidden after successful upload */}
        {books.length === 0 && (
          <div className="backdrop-blur-xl bg-white/40 rounded-3xl shadow-2xl shadow-black/5 border border-white/30 p-10 mb-8 hover:bg-white/50 transition-all duration-500">
            <label className="block cursor-pointer">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300/50 rounded-2xl py-16 px-8 hover:border-indigo-400/70 hover:bg-indigo-50/30 transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-indigo-600 group-hover:text-indigo-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors mb-3">
                  Upload your reading list
                </p>
                <p className="text-gray-600 mb-8 text-center max-w-md">
                  CSV files from Goodreads, StoryGraph, or similar platforms
                </p>
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-full font-medium group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105">
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
            <div className="backdrop-blur-xl bg-white/40 rounded-3xl shadow-2xl shadow-black/5 border border-white/30 p-8 hover:bg-white/50 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Your Library
                </h2>
                <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm text-indigo-700 font-semibold px-4 py-2 rounded-full border border-indigo-200/30">
                  {books.length} books
                </div>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {books.slice(0, booksToShow).map((b, i) => (
                  <div key={`${b.isbn13}-${i}`} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/40 transition-all duration-300 group border border-transparent hover:border-white/30 hover:shadow-lg hover:shadow-black/5">
                    <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform duration-300"></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{b.title}</p>
                      <p className="text-gray-600 mb-1">by {b.author}</p>
                      {b.year && (
                        <p className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded-full inline-block">{b.year}</p>
                      )}
                    </div>
                  </div>
                ))}
                {books.length > booksToShow && (
                  <div className="text-center py-4">
                    <button
                      onClick={() => setBooksToShow(prev => Math.min(prev + 10, books.length))}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105"
                    >
                      Load More ({books.length - booksToShow} remaining)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Map Section */}
            <div className="backdrop-blur-xl bg-white/40 rounded-3xl shadow-2xl shadow-black/5 border border-white/30 p-8 hover:bg-white/50 transition-all duration-500">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-8">
                Your Reading Map
              </h2>
              <div className="bg-gradient-to-br from-gray-50/50 to-white/50 backdrop-blur-sm rounded-2xl overflow-hidden shadow-inner border border-white/30">
                <MapChart highlighted={highlighted} />
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-sm shadow-sm"></div>
                  <span className="text-gray-700 font-medium">Countries explored</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-sm shadow-sm"></div>
                  <span className="text-gray-700 font-medium">Unexplored</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
