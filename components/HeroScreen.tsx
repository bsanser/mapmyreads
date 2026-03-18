import { StorageStatus } from './StorageStatus'

interface HeroScreenProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isProcessing: boolean
  error: string
}

export function HeroScreen({
  onFileUpload,
  isProcessing,
  error,
}: HeroScreenProps) {
  return (
    <div className="hero-screen">
      {/* Warm sepia gradient — creates the readable stage */}
      <div className="hero-overlay" />

      {/* Editorial two-column layout, anchored to bottom */}
      <div className="hero-content">

        {/* Left: brand mark + big headline */}
        <div className="hero-brand">
          <div className="hero-brand-mark">
            <img
              src="/logo.png"
              alt="Map My Reads"
              className="w-8 h-8 object-contain"
            />
            <span className="type-eyebrow" style={{ color: 'oklch(from var(--color-surface) l c h / 0.55)' }}>
              Map My Reads
            </span>
          </div>

          <h1 className="hero-headline">
            Map Your<br />Reading Journey
          </h1>

          <p className="hero-tagline">
            Upload your reading list to discover where in the world your books come from.
          </p>

          <p className="hero-sources">
            Export your library from{' '}
            <a
              href="https://www.goodreads.com/review/import"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-source-link"
            >
              Goodreads
            </a>
            {' '}or{' '}
            <a
              href="https://app.thestorygraph.com/user-export"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-source-link"
            >
              StoryGraph
            </a>
          </p>
        </div>

        {/* Right: upload action */}
        <div className="hero-upload-col">
          {error && (
            <div className="hero-error">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M12 5a7 7 0 110 14 7 7 0 010-14z" />
              </svg>
              <span className="type-ui">{error}</span>
            </div>
          )}

          {isProcessing && (
            <div className="hero-processing">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 flex-shrink-0" style={{ borderColor: 'var(--color-surface)' }} />
              <span className="type-ui" style={{ color: 'oklch(from var(--color-surface) l c h / 0.8)' }}>
                Processing your books…
              </span>
            </div>
          )}

          <label className="block cursor-pointer" tabIndex={0}>
            <div className="hero-dropzone">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'oklch(from var(--color-surface) l c h / 0.5)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8" />
              </svg>
              <p className="type-ui" style={{ color: 'oklch(from var(--color-surface) l c h / 0.7)' }}>
                Drop your CSV file here
              </p>
              <span className="btn-hero">Choose File</span>
            </div>
            <input type="file" accept=".csv" onChange={onFileUpload} className="sr-only" />
          </label>

          <StorageStatus />
        </div>

      </div>
    </div>
  )
}
