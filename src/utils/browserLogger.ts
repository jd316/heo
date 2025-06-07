/**
 * A simple browser-compatible logger for Edge runtime
 * This avoids using Node.js modules that aren't supported in Edge
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

class BrowserLogger {
  private minLevel: LogLevel;
  
  constructor(level: LogLevel = 'info') {
    this.minLevel = level;
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levelPriority: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levelPriority[level] >= levelPriority[this.minLevel];
  }
  
  private formatLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };
  }
  
  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      const entry = this.formatLogEntry('debug', message, data);
      console.debug(`[DEBUG] ${entry.timestamp} - ${entry.message}`, entry.data || '');
    }
  }
  
  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      const entry = this.formatLogEntry('info', message, data);
      console.info(`[INFO] ${entry.timestamp} - ${entry.message}`, entry.data || '');
    }
  }
  
  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      const entry = this.formatLogEntry('warn', message, data);
      console.warn(`[WARN] ${entry.timestamp} - ${entry.message}`, entry.data || '');
    }
  }
  
  error(message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      const entry = this.formatLogEntry('error', message, data);
      console.error(`[ERROR] ${entry.timestamp} - ${entry.message}`, entry.data || '');
    }
  }
}

// Export a singleton instance
export const browserLogger = new BrowserLogger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
); 