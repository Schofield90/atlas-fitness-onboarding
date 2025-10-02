// Client-side logging utility
export const clientLogger = {
  async log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    // Console log for immediate feedback
    console.log(`[${level.toUpperCase()}]`, message, data || '');

    // Send to server
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      console.error('Failed to send log to server:', error);
    }
  },

  info: (message: string, data?: any) => clientLogger.log('info', message, data),
  warn: (message: string, data?: any) => clientLogger.log('warn', message, data),
  error: (message: string, data?: any) => clientLogger.log('error', message, data),
};
