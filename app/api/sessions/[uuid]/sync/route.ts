import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import type { Book } from '../../../../../types/book'

export async function POST(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const sessionId = params.uuid
    const body = await request.json()
    const { books } = body as { books: Book[] }

    // Validate session exists
    const session = await prisma.session.findUnique({
      where: { sessionId: sessionId },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Validate books array
    if (!Array.isArray(books)) {
      return NextResponse.json(
        { error: 'books must be an array' },
        { status: 400 }
      )
    }

    // Use transaction to:
    // 1. Upsert all books
    // 2. Delete all existing SessionBook rows for this session
    // 3. Create new SessionBook rows
    const result = await prisma.$transaction(async (tx) => {
      // Upsert books
      const upsertedBooks = await Promise.all(
        books.map(async (book) => {
          let existingBook

          // Search for existing book by isbn13 if available
          if (book.isbn13) {
            existingBook = await tx.book.findFirst({
              where: { isbn13: book.isbn13 },
            })
          }

          // If not found by isbn13, search by title + author
          if (!existingBook) {
            existingBook = await tx.book.findFirst({
              where: {
                title: book.title,
                author: book.authors,
              },
            })
          }

          // Create or update the book
          // Note: Book type uses camelCase; DB schema uses snake_case
          const readDate = book.readDate ? new Date(book.readDate) : new Date()
          const yearStr = book.yearPublished ? String(book.yearPublished) : null

          if (existingBook) {
            return tx.book.update({
              where: { id: existingBook.id },
              data: {
                title: book.title,
                author: book.authors,
                isbn13: book.isbn13 || existingBook.isbn13,
                year: yearStr || existingBook.year,
                readDate,
                author_countries: book.authorCountries?.length ? book.authorCountries : existingBook.author_countries,
                book_countries: book.bookCountries?.length ? book.bookCountries : existingBook.book_countries,
              },
            })
          } else {
            return tx.book.create({
              data: {
                title: book.title,
                author: book.authors,
                isbn13: book.isbn13 || undefined,
                year: yearStr,
                readDate,
                author_countries: book.authorCountries || [],
                book_countries: book.bookCountries || [],
                userId: null, // anonymous books have no user
              },
            })
          }
        })
      )

      // Delete all existing SessionBook rows for this session
      await tx.sessionBook.deleteMany({
        where: { sessionId: session.id },
      })

      // Create new SessionBook rows for each book
      await Promise.all(
        upsertedBooks.map((book) =>
          tx.sessionBook.create({
            data: {
              sessionId: session.id,
              bookId: book.id,
            },
          })
        )
      )

      return { synced: upsertedBooks.length }
    })

    // Update lastSyncedAt timestamp
    await prisma.session.update({
      where: { sessionId: sessionId },
      data: { lastSyncedAt: new Date() },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(`POST /api/sessions/[uuid]/sync error:`, error)
    return NextResponse.json(
      { error: 'Failed to sync books' },
      { status: 500 }
    )
  }
}
