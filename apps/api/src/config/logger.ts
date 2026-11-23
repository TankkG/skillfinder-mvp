type Level = 'info' | 'warn' | 'error' | 'debug';

const write = (level: Level, message: string, meta?: unknown) => {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta === undefined) {
    // eslint-disable-next-line no-console
    console.log(base);
    return;
  }
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](base, meta);
};

export const logger = {
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      write('debug', message, meta);
    }
  },
};
