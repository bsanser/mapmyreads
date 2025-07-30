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
