'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface Progress {
  current: number
  total: number
  stage: string
}

interface EnrichmentContextValue {
  isEnriching: boolean
  setIsEnriching: (value: boolean) => void
  enrichmentProgress: Progress
  setEnrichmentProgress: (progress: Progress) => void
  isLoadingCovers: boolean
  setIsLoadingCovers: (value: boolean) => void
  coverProgress: Progress
  setCoverProgress: (progress: Progress) => void
}

const EnrichmentContext = createContext<EnrichmentContextValue | null>(null)

export function EnrichmentProvider({ children }: { children: ReactNode }) {
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = useState<Progress>({ current: 0, total: 0, stage: '' })
  const [isLoadingCovers, setIsLoadingCovers] = useState(false)
  const [coverProgress, setCoverProgress] = useState<Progress>({ current: 0, total: 0, stage: '' })

  return (
    <EnrichmentContext.Provider
      value={{
        isEnriching,
        setIsEnriching,
        enrichmentProgress,
        setEnrichmentProgress,
        isLoadingCovers,
        setIsLoadingCovers,
        coverProgress,
        setCoverProgress,
      }}
    >
      {children}
    </EnrichmentContext.Provider>
  )
}

export function useEnrichment() {
  const ctx = useContext(EnrichmentContext)
  if (!ctx) throw new Error('useEnrichment must be used within an EnrichmentProvider')
  return ctx
}
