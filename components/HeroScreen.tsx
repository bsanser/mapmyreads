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
  onToggleDeveloperMode 
}: HeroScreenProps) {
  return (
    <div
      className="relative min-h-screen font-mono overflow-hidden"
      style={{
        backgroundImage: "url('/vintage_world_map.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-2xl">
          {/* Icon */}
          <div className="w-32 h-32 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center mx-auto mb-8 border border-gray-300 shadow-lg">
            <svg
              className="w-16 h-16 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Map Your Reading Journey</h1>
          <p className="text-xl text-gray-600 mb-8">
            Upload your reading list to visualize the countries and cultures you&apos;ve explored through literature
          </p>

          {/* Export Instructions */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-700 px-6 py-4 rounded-lg mb-8 shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-900">How to export your reading list:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Goodreads:</strong> Go to your <a href="https://www.goodreads.com/review/import" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900 transition-colors">Goodreads Import/Export page</a> and download your library</p>
              <p><strong>StoryGraph:</strong> Visit <a href="https://app.thestorygraph.com/user-export" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900 transition-colors">The StoryGraph Export page</a> to download your data</p>
            </div>
          </div>

          <StorageStatus />
          
          {error && (
            <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8 flex items-center gap-4">
              <span className="font-medium">{error}</span>
            </div>
          )}

          {isProcessing && (
            <div className="bg-gray-50/90 backdrop-blur-sm border border-gray-200 text-gray-700 px-6 py-4 rounded-lg mb-8 flex items-center gap-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="font-medium">Processing your books and enriching your data...</span>
            </div>
          )}

          <label className="block cursor-pointer">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-10 hover:bg-white/95 transition-all">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-16 px-8 hover:border-gray-400 transition-colors group">
                <svg className="w-8 h-8 text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3-3m3 3l3-3" />
                </svg>
                <p className="text-xl font-semibold text-gray-800 mb-3">Upload your reading list</p>
                <p className="text-gray-600 mb-8 text-center max-w-md">CSV files from Goodreads or StoryGraph</p>
                <div className="bg-gray-900 text-white px-8 py-3 rounded font-medium hover:bg-gray-800 transition-colors">
                  Choose File
                </div>
              </div>
              <input type="file" accept=".csv" onChange={onFileUpload} className="sr-only" />
            </div>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-600 text-sm">
                Made with ❤️ for book lovers around the world
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Upload your reading list • Share your journey • Explore the world through books
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onToggleDeveloperMode}
                className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                title="Toggle developer mode"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Dev
              </button>
              <BuyMeACoffee />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
