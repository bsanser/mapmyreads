interface DeveloperToolsProps {
  isVisible: boolean
  onClose: () => void
  books: any[]
}

export function DeveloperTools({
  isVisible,
  onClose,
  books
}: DeveloperToolsProps) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Developer Tools</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="text-xs text-gray-500 space-y-2">
        <p>Books loaded: {books.length}</p>
        <p>Countries detected: {books.filter(b => b.bookCountries.length > 0 || b.authorCountries.length > 0).length}</p>
      </div>
    </div>
  )
}
