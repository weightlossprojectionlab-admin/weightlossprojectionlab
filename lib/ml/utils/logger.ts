/**
 * ML Logger
 * Simple logging utility for ML operations
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  data?: any
}

class MLLogger {
  private logs: LogEntry[] = []
  private enableConsole: boolean = true
  private minLevel: LogLevel = 'info'

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  setMinLevel(level: LogLevel) {
    this.minLevel = level
  }

  setConsoleEnabled(enabled: boolean) {
    this.enableConsole = enabled
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel]
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, data?: any) {
    this.log('error', message, data)
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    }

    this.logs.push(entry)

    if (this.enableConsole) {
      const prefix = `[ML ${level.toUpperCase()}]`
      const timestamp = entry.timestamp.toISOString()

      switch (level) {
        case 'debug':
          console.debug(`${prefix} ${timestamp} ${message}`, data || '')
          break
        case 'info':
          console.log(`${prefix} ${timestamp} ${message}`, data || '')
          break
        case 'warn':
          console.warn(`${prefix} ${timestamp} ${message}`, data || '')
          break
        case 'error':
          console.error(`${prefix} ${timestamp} ${message}`, data || '')
          break
      }
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level)
    }
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }

  getLogsSummary(): string {
    const summary = {
      total: this.logs.length,
      debug: this.logs.filter(l => l.level === 'debug').length,
      info: this.logs.filter(l => l.level === 'info').length,
      warn: this.logs.filter(l => l.level === 'warn').length,
      error: this.logs.filter(l => l.level === 'error').length,
    }

    return `Total: ${summary.total} (Debug: ${summary.debug}, Info: ${summary.info}, Warn: ${summary.warn}, Error: ${summary.error})`
  }
}

// Singleton instance
export const mlLogger = new MLLogger()
