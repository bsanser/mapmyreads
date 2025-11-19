// Performance logging utility for tracking map loading times

interface PerformanceLog {
  timestamp: string
  event: string
  duration?: number
  bookCount?: number
  readBookCount?: number
  unreadBookCount?: number
  hasCountries?: boolean
  error?: string
  fileName?: string
  fileSize?: number
  totalBookCount?: number
  resolvedAuthorCount?: number
  note?: string
}

class PerformanceLogger {
  private logs: PerformanceLog[] = []
  private startTime: number | null = null

  startTimer(event: string): void {
    this.startTime = performance.now()
    this.logs.push({
      timestamp: new Date().toISOString(),
      event: `${event}_start`
    })
  }

  endTimer(event: string, metadata?: Partial<PerformanceLog>): void {
    if (!this.startTime) {
      console.warn('PerformanceLogger: No start time found for', event)
      return
    }

    const duration = performance.now() - this.startTime
    this.startTime = null

    const logEntry: PerformanceLog = {
      timestamp: new Date().toISOString(),
      event: `${event}_end`,
      duration: Math.round(duration),
      ...metadata
    }

    this.logs.push(logEntry)
  }

  logEvent(event: string, metadata?: Partial<PerformanceLog>): void {
    const logEntry: PerformanceLog = {
      timestamp: new Date().toISOString(),
      event,
      ...metadata
    }
    this.logs.push(logEntry)
  }

  async saveToFile(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const logData = {
        sessionId: this.generateSessionId(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        logs: this.logs
      }

      const blob = new Blob([JSON.stringify(logData, null, 2)], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `map-performance-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('❌ Error saving performance logs:', error)
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  getLogs(): PerformanceLog[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
    this.startTime = null
  }
}

// Create a singleton instance
export const performanceLogger = new PerformanceLogger()

// Convenience functions
export const startMapLoadTimer = () => performanceLogger.startTimer('map_load')
export const endMapLoadTimer = (metadata?: Partial<PerformanceLog>) => performanceLogger.endTimer('map_load', metadata)
export const logMapEvent = (event: string, metadata?: Partial<PerformanceLog>) => performanceLogger.logEvent(event, metadata)
export const savePerformanceLogs = () => performanceLogger.saveToFile() 
