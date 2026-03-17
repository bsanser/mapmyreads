import { describe, it, expect } from 'vitest'
import { getCountryBookCounts, generateHeatmapStyle } from '../lib/heatmapEngine'

const THEME = { fill: '#B3D9E5', outline: '#0A6A89', hover: '#7FB3C7', selected: '#E8F4F8', background: '#eef3f5' }

function makeBook(authorCountries: string[], readStatus = 'read') {
  return { title: 'T', authors: 'A', readStatus, authorCountries, bookCountries: [], isbn13: null, coverImage: null }
}

describe('getCountryBookCounts', () => {
  it('counts read books per author country', () => {
    const books = [makeBook(['FR']), makeBook(['FR']), makeBook(['DE'])]
    const counts = getCountryBookCounts(books)
    expect(counts['FR']).toBe(2)
    expect(counts['DE']).toBe(1)
  })

  it('ignores non-read books', () => {
    const books = [makeBook(['FR'], 'read'), makeBook(['FR'], 'to_read')]
    const counts = getCountryBookCounts(books)
    expect(counts['FR']).toBe(1)
  })

  it('falls back to bookCountries when authorCountries is empty', () => {
    const book = { ...makeBook([]), bookCountries: ['JP'] }
    const counts = getCountryBookCounts([book])
    expect(counts['JP']).toBe(1)
  })
})

describe('generateHeatmapStyle', () => {
  it('returns white when no books have country data', () => {
    const result = generateHeatmapStyle([makeBook([])], THEME)
    expect(result).toBe('#ffffff')
  })

  it('returns a MapLibre case expression when books have countries', () => {
    const books = [makeBook(['US']), makeBook(['US'])]
    const result = generateHeatmapStyle(books, THEME)
    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toBe('case')
  })
})
