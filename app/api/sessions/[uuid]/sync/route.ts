import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { validateSessionOwnership } from '../../../../../lib/security'
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

    // Ownership check: claimed sessions can only be synced by their owner
    const cookieUserId = request.cookies.get('mmr_uid')?.value ?? null
    if (!validateSessionOwnership(session.userId, cookieUserId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
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
    // Upsert books sequentially (Promise.all inside interactive transactions
    // exhausts the single connection Neon provides, causing timeouts)
    const upsertedBooks = []
    const coversInPayload = books.filter(b => b.coverImage).length
    console.log(`[sync] ${books.length} books, ${coversInPayload} with coverImage`)

    for (const book of books) {
      let existingBook

      if (book.isbn13) {
        existingBook = await prisma.book.findFirst({ where: { isbn13: book.isbn13 } })
      }
      if (!existingBook) {
        existingBook = await prisma.book.findFirst({
          where: { title: book.title, author: book.authors },
        })
      }

      const readDate = book.readDate ? new Date(book.readDate) : new Date()
      const yearStr = book.yearPublished ? String(book.yearPublished) : null

      const upserted = existingBook
        ? await prisma.book.update({
            where: { id: existingBook.id },
            data: {
              title: book.title,
              author: book.authors,
              isbn13: book.isbn13 || existingBook.isbn13,
              year: yearStr || existingBook.year,
              readDate,
              author_countries: book.authorCountries?.length ? book.authorCountries : existingBook.author_countries,
              book_countries: book.bookCountries?.length ? book.bookCountries : existingBook.book_countries,
              coverUrl: book.coverImage || existingBook.coverUrl,
            },
          })
        : await prisma.book.create({
            data: {
              title: book.title,
              author: book.authors,
              isbn13: book.isbn13 || undefined,
              year: yearStr,
              readDate,
              author_countries: book.authorCountries || [],
              book_countries: book.bookCountries || [],
              coverUrl: book.coverImage || undefined,
              userId: null,
            },
          })

      upsertedBooks.push(upserted)
    }

    // Deduplicate by bookId — two books with the same title+author map to the
    // same DB row, and inserting both would violate the session_books unique constraint.
    const seenBookIds = new Set<string>()
    const uniqueBooks = upsertedBooks.filter(b => {
      if (seenBookIds.has(b.id)) return false
      seenBookIds.add(b.id)
      return true
    })

    // Rebuild SessionBook links in a single lightweight transaction
    await prisma.$transaction([
      prisma.sessionBook.deleteMany({ where: { sessionId: session.id } }),
      ...uniqueBooks.map(book =>
        prisma.sessionBook.create({
          data: { sessionId: session.id, bookId: book.id },
        })
      ),
    ])

    const result = { synced: uniqueBooks.length }

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
