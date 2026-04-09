import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import type { Book } from '../../../../../types/book'

export async function GET(
  _request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const sessionId = params.uuid

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        books: {
          include: { book: true },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ books: [], sessionExists: false })
    }

    // Batch-lookup covers from cache for books with isbn13
    const isbn13List = session.books
      .map(({ book: b }) => b.isbn13)
      .filter((v): v is string => !!v)

    const coverCache = isbn13List.length > 0
      ? await prisma.bookMetadataCache.findMany({
          where: { isbn13: { in: isbn13List } },
          select: { isbn13: true, coverUrl: true },
        })
      : []

    const coverByIsbn = new Map(coverCache.map(c => [c.isbn13, c.coverUrl ?? null]))

    // Map DB rows back to the frontend Book type
    const books: Book[] = session.books.map(({ book: b }) => ({
      title: b.title,
      authors: b.author,
      isbn13: b.isbn13 ?? null,
      yearPublished: b.year ? parseInt(b.year, 10) || null : null,
      authorCountries: b.author_countries,
      bookCountries: b.book_countries,
      readStatus: 'read' as const,
      readDate: b.readDate,
      avgRating: null,
      myRating: null,
      numberOfPages: null,
      bookshelves: [],
      coverImage: b.isbn13 ? (coverByIsbn.get(b.isbn13) ?? null) : null,
      source: 'manual' as const,
      originalData: {},
    }))

    return NextResponse.json({ books, sessionExists: true })
  } catch (error) {
    console.error('GET /api/sessions/[uuid]/books error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    )
  }
}
