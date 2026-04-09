import { useState, useEffect } from 'react'
import { useEnrichment } from '../contexts/EnrichmentContext'

function ProgressBar({ current, total, stage, color = 'var(--color-accent)' }: {
  current: number
  total: number
  stage: string
  color?: string
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="animate-spin rounded-full h-4 w-4 border-2" style={{ borderColor: 'var(--color-border)', borderTopColor: color }}></div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="type-caption mb-1">{stage}</p>

        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--color-border-light)' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>

        <p className="type-meta mt-0.5">{current} of {total} ({percentage}%)</p>
      </div>
    </div>
  )
}

function DoneMessage() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="status-success">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      All authors mapped!
    </div>
  )
}

export function EnrichmentProgress() {
  const { isEnriching, enrichmentProgress, isLoadingCovers, coverProgress } = useEnrichment()
  const [showAuthorsDone, setShowAuthorsDone] = useState(false)

  useEffect(() => {
    if (!isEnriching && isLoadingCovers) {
      setShowAuthorsDone(true)
      const timer = setTimeout(() => setShowAuthorsDone(false), 2000)
      return () => clearTimeout(timer)
    }
    setShowAuthorsDone(false)
  }, [isEnriching, isLoadingCovers])

  if (!isEnriching && !isLoadingCovers) return null

  // Mobile: compact mode; Desktop: full mode
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  if (isMobile) {
    return (
      <div className="mobile-enrichment-indicator" title="Loading author countries…">
        <div className="animate-spin rounded-full h-3 w-3 border-2" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    )
  }

  // Desktop: show both stages with details
  return (
    <div className="surface-float fixed bottom-6 right-6 z-50 animate-slide-up space-y-3">
      <p className="type-ui">Enriching your data...</p>
      <p className="type-caption" style={{ color: 'var(--color-ink-2)' }}>Your file had books. We're adding the world — looking up where every author comes from.</p>

      {isEnriching && (
        <ProgressBar
          current={enrichmentProgress.current}
          total={enrichmentProgress.total}
          stage={enrichmentProgress.stage}
          color="var(--color-accent)"
        />
      )}

      {showAuthorsDone && <DoneMessage />}

      {isLoadingCovers && (
        <ProgressBar
          current={coverProgress.current}
          total={coverProgress.total}
          stage={coverProgress.stage}
          color="oklch(68% 0.16 70)"
        />
      )}
    </div>
  )
}
