interface EnrichmentProgressProps {
  current: number
  total: number
  stage: string
}

export function EnrichmentProgress({ current, total, stage }: EnrichmentProgressProps) {
  if (total === 0) return null
  
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        {/* Animated spinner */}
        <div className="flex-shrink-0 mt-1">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Enriching your data...
          </p>
          <p className="text-xs text-gray-600 mb-2">
            {stage}
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          {/* Progress text */}
          <p className="text-xs text-gray-500 mt-1">
            {current} of {total} ({percentage}%)
          </p>
        </div>
      </div>
    </div>
  )
}
