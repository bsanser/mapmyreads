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
      coverImage: b.coverUrl ?? null,
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
