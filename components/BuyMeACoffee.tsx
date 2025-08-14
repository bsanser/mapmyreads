'use client'

export const BuyMeACoffee = ({ className = '' }: { className?: string }) => {
  const handleBuyCoffee = () => {
    // This would typically link to a payment service like Buy Me a Coffee, Ko-fi, etc.
    // For now, we'll open a new window with a placeholder
    window.open('https://buymeacoffee.com', '_blank')
  }

  return (
    <button
      onClick={handleBuyCoffee}
      className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2 hover:bg-gray-50 border border-gray-200 ${className}`}
      title="Buy me a coffee"

    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      </svg>
      <span className="hidden lg:inline text-sm font-medium">Buy me a coffee</span>
    </button>
  )
} 