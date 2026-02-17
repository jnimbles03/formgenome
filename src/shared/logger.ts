type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[Form Genome]';

// In production builds, debug and info are suppressed
const LOG_LEVEL: LogLevel = 'warn';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[LOG_LEVEL];
}

export const log = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.log(`${PREFIX} ${message}`, ...args);
    }
  },
  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.log(`${PREFIX} ${message}`, ...args);
    }
  },
  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(`${PREFIX} ${message}`, ...args);
    }
  },
  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(`${PREFIX} ${message}`, ...args);
    }
  },
};
