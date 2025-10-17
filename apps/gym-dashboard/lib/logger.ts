import pino from 'pino';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const logDir = path.join(process.cwd(), 'logs');

// Create separate file transports for app and error logs
const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      level: 'info',
      options: {
        destination: path.join(logDir, 'app.log'),
        colorize: false,
        translateTime: 'SYS:standard',
        mkdir: true,
      },
    },
    {
      target: 'pino-pretty',
      level: 'error',
      options: {
        destination: path.join(logDir, 'error.log'),
        colorize: false,
        translateTime: 'SYS:standard',
        mkdir: true,
      },
    },
    // Console output for development
    ...(isProduction ? [] : [{
      target: 'pino-pretty',
      level: 'info',
      options: {
        destination: 1, // stdout
        colorize: true,
        translateTime: 'SYS:standard',
      },
    }]),
  ],
});

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
}, transport);

export default logger;
