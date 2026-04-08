export type SearchBookResult = {
  title: string
  author: string
  isbn13: string | null
  coverUrl: string | null
  year: number | null
}

function normalizeForDedup(str: string): string {
  return str.toLowerCase().replace(/[^\w\s]/g, '').trim().replace(/\s+/g, ' ')
}

export function parseOpenLibraryResults(raw: any): SearchBookResult[] {
  const docs: any[] = raw?.docs ?? []
  return docs.map((doc) => {
    const isbns: string[] = doc.isbn ?? []
    const isbn13 = isbns.find(
      (isbn) => isbn.length === 13 && (isbn.startsWith('978') || isbn.startsWith('979'))
    ) ?? null
    const coverUrl = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null
    const authorNames: string[] = doc.author_name ?? []
    return {
      title: doc.title ?? '',
      author: authorNames[0] ?? '',
      isbn13,
      coverUrl,
      year: doc.first_publish_year ?? null,
    }
  })
}

export function parseGoogleBooksResults(raw: any): SearchBookResult[] {
  const items: any[] = raw?.items ?? []
  return items.map((item) => {
    const info = item.volumeInfo ?? {}
    const identifiers: any[] = info.industryIdentifiers ?? []
    const isbn13Entry = identifiers.find((id) => id.type === 'ISBN_13')
    const isbn13 = isbn13Entry?.identifier ?? null
    const coverUrl = info.imageLinks?.thumbnail ?? null
    const authors: string[] = info.authors ?? []
    const yearRaw = info.publishedDate ?? null
    const year = yearRaw ? parseInt(yearRaw.slice(0, 4), 10) || null : null
    return {
      title: info.title ?? '',
      author: authors[0] ?? '',
      isbn13,
      coverUrl,
      year,
    }
  })
}

export function mergeSearchResults(
  olResults: SearchBookResult[],
  gbResults: SearchBookResult[]
): SearchBookResult[] {
  const seenISBNs = new Set<string>()
  const seenTitleAuthors = new Set<string>()
  const merged: SearchBookResult[] = []

  function titleAuthorKey(book: SearchBookResult): string {
    return `${normalizeForDedup(book.title)}|${normalizeForDedup(book.author)}`
  }

  for (const book of olResults) {
    if (book.isbn13) seenISBNs.add(book.isbn13)
    seenTitleAuthors.add(titleAuthorKey(book))
    merged.push(book)
  }

  for (const book of gbResults) {
    if (book.isbn13 && seenISBNs.has(book.isbn13)) continue
    if (seenTitleAuthors.has(titleAuthorKey(book))) continue
    if (book.isbn13) seenISBNs.add(book.isbn13)
    seenTitleAuthors.add(titleAuthorKey(book))
    merged.push(book)
  }

  return merged
}
