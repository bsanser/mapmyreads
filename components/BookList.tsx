// components/BookList.tsx
import { Book } from '@/app/page'
import ReactCountryFlag from 'react-country-flag'

export function BookList({ books }: { books: Book[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold mb-2">Your Library</h2>
      <p className="text-sm text-gray-600 mb-4">{books.length} books</p>
      <ul className="space-y-3">
        {books.map((b, i) => (
          <li key={`${b.isbn13}-${i}`} className="flex items-start">
            <div className="mr-2">
              {b.countries.map((cc) => (
                <ReactCountryFlag
                  key={cc}
                  countryCode={cc}
                  svg
                  style={{ width: '1em', height: '1em', marginRight: '0.25em' }}
                />
              ))}
            </div>
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-sm text-gray-600">
                by {b.author} {b.year && `(${b.year})`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
import { Book } from '@/app/page'

type BookListProps = {
  books: Book[]
}

export function BookList({ books }: BookListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Books Read ({books.length})</h2>
      <div className="space-y-3">
        {books.map((book, index) => (
          <div key={`${book.isbn13}-${index}`} className="border border-gray-200 rounded-lg p-3">
            <h3 className="font-semibold text-sm">{book.title}</h3>
            <p className="text-gray-600 text-xs">{book.author}</p>
            <p className="text-gray-500 text-xs">
              {book.year && `${book.year} • `}
              {book.readDate.toLocaleDateString()}
            </p>
            {book.countries.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {book.countries.map((country, i) => (
                    <span
                      key={i}
                      className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded"
                    >
                      {country}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
