'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { ThemeKey, THEMES } from '../lib/themeManager'

interface ThemeContextValue {
  currentTheme: ThemeKey
  setCurrentTheme: (theme: ThemeKey) => void
  themeObject: typeof THEMES[ThemeKey]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('sepia')

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, themeObject: THEMES[currentTheme] }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
