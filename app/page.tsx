"use client";

import { useState } from "react";
import Papa from "papaparse";
import ReactCountryFlag from "react-country-flag";
import { MapChart } from "../components/MapChart";

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
  const highlighted = new Set<string>(
    books.flatMap(b => b.countries)
  );

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
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">📚 MapMyReads</h1>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>
      )}

      {/* File Upload */}
      <input type="file" accept=".csv" onChange={handleFile} className="mb-6" />

      {/* Book List */}
      {books.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-2">
            Books You’ve Read ({books.length})
          </h2>
          <ul className="list-disc list-inside space-y-1">
            {books.map((b, i) => (
              <li key={`${b.isbn13}-${i}`}>
                {b.title} by {b.author} ({b.year || "N/A"})
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* World Map */}
           {books.length > 0 && (
             <>
               <h2 className="text-2xl font-semibold mt-8">
                 Your Reading Map
               </h2>
               <MapChart highlighted={highlighted} />
             </>
           )}
    </div>
  );
}