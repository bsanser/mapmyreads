import { Book } from '../types/book'

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function titleAuthorKey(book: Book): string {
  return `${normalizeString(book.title)}|${normalizeString(book.authors)}`
}

export function isDuplicate(incoming: Book, existing: Book[]): boolean {
  for (const book of existing) {
    // ISBN13 match when both have it
    if (incoming.isbn13 && book.isbn13) {
      if (incoming.isbn13 === book.isbn13) return true
      continue
    }
    // Fall back to normalised title+author
    if (titleAuthorKey(incoming) === titleAuthorKey(book)) return true
  }
  return false
}

export function deduplicateBooks(
  incoming: Book[],
  existing: Book[]
): { newBooks: Book[]; skipped: number } {
  const newBooks: Book[] = []
  let skipped = 0

  for (const book of incoming) {
    if (isDuplicate(book, existing)) {
      skipped++
    } else {
      newBooks.push(book)
    }
  }

  return { newBooks, skipped }
}

export function tryAddBook(
  book: Book,
  existingBooks: Book[]
): { result: 'added' | 'duplicate'; books: Book[] } {
  if (isDuplicate(book, existingBooks)) {
    return { result: 'duplicate', books: existingBooks }
  }
  return { result: 'added', books: [book, ...existingBooks] }
}
