const levels = {
  INFO: '\x1b[32m[INFO]\x1b[0m',
  WARN: '\x1b[33m[WARN]\x1b[0m',
  ERROR: '\x1b[31m[ERROR]\x1b[0m',
  DEBUG: '\x1b[36m[DEBUG]\x1b[0m',
};

const formatTime = (): string => new Date().toISOString();

export const logger = {
  info: (msg: string, ...meta: unknown[]): void =>
    console.log(`${formatTime()} ${levels.INFO} ${msg}`, ...meta),
  warn: (msg: string, ...meta: unknown[]): void =>
    console.warn(`${formatTime()} ${levels.WARN} ${msg}`, ...meta),
  error: (msg: string, ...meta: unknown[]): void =>
    console.error(`${formatTime()} ${levels.ERROR} ${msg}`, ...meta),
  debug: (msg: string, ...meta: unknown[]): void =>
    console.debug(`${formatTime()} ${levels.DEBUG} ${msg}`, ...meta),
};
