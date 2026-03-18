import type { Metadata } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import './globals.css'
import { BooksProvider } from '../contexts/BooksContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import { EnrichmentProvider } from '../contexts/EnrichmentContext'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Map my Reads',
  description: 'Generate a map from your reading history',
  other: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:;"
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning={true}>
        <BooksProvider>
          <ThemeProvider>
            <EnrichmentProvider>
              {children}
            </EnrichmentProvider>
          </ThemeProvider>
        </BooksProvider>
      </body>
    </html>
  )
}
