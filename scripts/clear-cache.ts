// Script to clear all cached data from Supabase
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearCache() {
  console.log('🧹 Clearing Supabase cache...\n')

  try {
    // Count before deletion
    const authorCount = await prisma.authorCache.count()
    const bookCount = await prisma.bookMetadataCache.count()

    console.log(`📊 Current cache size:`)
    console.log(`   - Authors: ${authorCount}`)
    console.log(`   - Book metadata: ${bookCount}\n`)

    // Delete all cached authors
    const deletedAuthors = await prisma.authorCache.deleteMany({})
    console.log(`✅ Deleted ${deletedAuthors.count} author cache entries`)

    // Delete all cached book metadata
    const deletedBooks = await prisma.bookMetadataCache.deleteMany({})
    console.log(`✅ Deleted ${deletedBooks.count} book metadata cache entries`)

    console.log('\n🎉 Cache cleared successfully!')
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearCache()
