import { Book } from '../types/book'

export type CsvSummary = {
  totalBooks: number
  readBooks: number
  booksWithIsbn13: number
  booksWithoutIsbn13: number
  readBooksWithoutIsbn13: number
  booksWithoutAuthor: number
  readBooksWithoutAuthor: number
  booksWithMoreThanOneAuthor: number
  booksWithSingleAuthor: number
  booksWithTwoOrMoreAuthors: number
  distinctAuthors: number
  duplicateTitleAuthorPairs: number
  sourceBreakdown: Record<'goodreads' | 'storygraph', number>
  usefulInsights: string[]
}

const extractAdditionalGoodreadsAuthors = (book: Book): string[] => {
  const additional = (book.originalData?.['Additional Authors'] as string | undefined) || ''
  return additional
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)
}

const extractStoryGraphAuthors = (book: Book): string[] => {
  const rawAuthors = (book.originalData?.['Authors'] as string | undefined) || book.authors || ''
  return rawAuthors
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)
}

const normalizeAuthorName = (author: string): string => author.trim().toLowerCase()

export const generateCsvSummary = (books: Book[]): CsvSummary => {
  const summary = {
    totalBooks: 0,
    readBooks: 0,
    booksWithIsbn13: 0,
    booksWithoutIsbn13: 0,
    readBooksWithoutIsbn13: 0,
    booksWithoutAuthor: 0,
    readBooksWithoutAuthor: 0,
    booksWithMoreThanOneAuthor: 0,
    booksWithSingleAuthor: 0,
    booksWithTwoOrMoreAuthors: 0,
    distinctAuthors: 0,
    duplicateTitleAuthorPairs: 0,
    sourceBreakdown: {
      goodreads: 0,
      storygraph: 0
    } as Record<'goodreads' | 'storygraph', number>,
    usefulInsights: [] as string[]
  }

  const distinctAuthors = new Set<string>()
  const duplicateTracker = new Map<string, number>()
  const duplicatePairs = new Set<string>()

  for (const book of books) {
    summary.totalBooks += 1
    summary.sourceBreakdown[book.source] += 1

    const isRead = book.readStatus === 'read'
    if (isRead) {
      summary.readBooks += 1
    }

    if (book.isbn13) {
      summary.booksWithIsbn13 += 1
    } else {
      summary.booksWithoutIsbn13 += 1
      if (isRead) {
        summary.readBooksWithoutIsbn13 += 1
      }
    }

    const normalizedPrimaryAuthor = (book.authors || '').trim()
    const hasPrimaryAuthor = normalizedPrimaryAuthor.length > 0

    if (!hasPrimaryAuthor) {
      summary.booksWithoutAuthor += 1
      if (isRead) {
        summary.readBooksWithoutAuthor += 1
      }
    }

    let totalAuthors = 0
    if (book.source === 'goodreads') {
      if (hasPrimaryAuthor) {
        distinctAuthors.add(normalizeAuthorName(normalizedPrimaryAuthor))
        totalAuthors += 1
      }

      const additionalAuthors = extractAdditionalGoodreadsAuthors(book)
      additionalAuthors.forEach(author => distinctAuthors.add(normalizeAuthorName(author)))
      totalAuthors += additionalAuthors.length
    } else {
      const authors = extractStoryGraphAuthors(book)
      authors.forEach(author => distinctAuthors.add(normalizeAuthorName(author)))
      totalAuthors = authors.length
    }

    if (totalAuthors >= 2) {
      summary.booksWithMoreThanOneAuthor += 1
      summary.booksWithTwoOrMoreAuthors += 1
    } else if (totalAuthors === 1) {
      summary.booksWithSingleAuthor += 1
    }

    const duplicateKey = `${(book.title || '').trim().toLowerCase()}|${(book.authors || '')
      .trim()
      .toLowerCase()}`
    const currentCount = duplicateTracker.get(duplicateKey) || 0
    duplicateTracker.set(duplicateKey, currentCount + 1)
    if (currentCount >= 1) {
      duplicatePairs.add(duplicateKey)
    }
  }

  summary.distinctAuthors = distinctAuthors.size
  summary.duplicateTitleAuthorPairs = duplicatePairs.size

  const insights: string[] = []
  if (summary.readBooksWithoutIsbn13 > 0) {
    insights.push(`${summary.readBooksWithoutIsbn13} read books are missing an ISBN-13.`)
  }
  if (summary.booksWithMoreThanOneAuthor > 0) {
    insights.push(`${summary.booksWithMoreThanOneAuthor} books list multiple authors.`)
  }
  if (summary.duplicateTitleAuthorPairs > 0) {
    insights.push(`${summary.duplicateTitleAuthorPairs} title/author combinations appear multiple times.`)
  }
  if (summary.booksWithoutAuthor > 0) {
    insights.push(`${summary.booksWithoutAuthor} books have no recorded author.`)
  }
  if (summary.readBooksWithoutAuthor > 0) {
    insights.push(`${summary.readBooksWithoutAuthor} read books lack author information.`)
  }
  summary.usefulInsights = insights

  return summary
}
