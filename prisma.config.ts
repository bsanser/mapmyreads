import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Load .env.local for CLI commands (prisma db push, prisma migrate, etc.)
config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
