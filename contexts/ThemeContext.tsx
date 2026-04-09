'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ThemeKey, THEMES } from '../lib/themeManager'

interface ThemeContextValue {
  currentTheme: ThemeKey
  setCurrentTheme: (theme: ThemeKey) => void
  themeObject: typeof THEMES[ThemeKey]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('claret')

  useEffect(() => {
    const t = THEMES[currentTheme]
    const root = document.documentElement
    root.style.setProperty('--color-accent', t.accent)
    root.style.setProperty('--color-accent-hover', t.accentHover)
    root.style.setProperty('--color-accent-soft', t.accentSoft)
    root.style.setProperty('--color-accent-border', t.accentBorder)
  }, [currentTheme])

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
