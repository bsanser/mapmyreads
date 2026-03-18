import { StorageStatus } from './StorageStatus'
import { BuyMeACoffee } from './BuyMeACoffee'

interface HeroScreenProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isProcessing: boolean
  error: string
  showDeveloperMode: boolean
  onToggleDeveloperMode: () => void
}

export function HeroScreen({
  onFileUpload,
  isProcessing,
  error,
  showDeveloperMode,
  onToggleDeveloperMode,
}: HeroScreenProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/vintage_world_map.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-2xl">
          {/* Brand mark */}
          <div className="logo-box">
            <img
              src="/logo.png"
              alt="Your Reading Map logo"
              className="w-20 h-20 object-contain drop-shadow-sm"
            />
          </div>

          <h1 className="type-display mb-6">Map Your Reading Journey</h1>
          <p className="type-lead mb-8">
            Upload your reading list to visualize the countries and cultures you&apos;ve explored through literature
          </p>

          {/* Export Instructions */}
          <div className="hero-instructions">
            <h3 className="type-ui mb-3">How to export your reading list:</h3>
            <div className="type-body space-y-2">
              <p><strong>Goodreads:</strong> Go to your <a href="https://www.goodreads.com/review/import" target="_blank" rel="noopener noreferrer" className="link-accent">Goodreads Import/Export page</a> and download your library</p>
              <p><strong>StoryGraph:</strong> Visit <a href="https://app.thestorygraph.com/user-export" target="_blank" rel="noopener noreferrer" className="link-accent">The StoryGraph Export page</a> to download your data</p>
            </div>
          </div>

          <StorageStatus />

          {error && (
            <div className="hero-error">
              <span className="type-ui">{error}</span>
            </div>
          )}

          {isProcessing && (
            <div className="hero-processing">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
              <span className="type-ui">Processing your books and enriching your data...</span>
            </div>
          )}

          <label className="block cursor-pointer">
            <div className="upload-card">
              <div className="upload-dropzone flex flex-col items-center justify-center">
                <svg className="w-8 h-8 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-ink-3)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3-3m3 3l3-3" />
                </svg>
                <p className="type-heading mb-3">Upload your reading list</p>
                <p className="type-caption mb-8 text-center max-w-md">CSV files from Goodreads or StoryGraph</p>
                <div className="btn-primary">
                  Choose File
                </div>
              </div>
              <input type="file" accept=".csv" onChange={onFileUpload} className="sr-only" />
            </div>
          </label>
        </div>
      </div>

    </div>
  )
}
