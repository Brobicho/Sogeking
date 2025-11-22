import { CONSOLE_COLORS } from '../constants';

/**
 * Logger levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Simple logger class
 */
export class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`${CONSOLE_COLORS.GREEN}✓${CONSOLE_COLORS.RESET} ${message}`, ...args);
    }
  }

  failure(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`${CONSOLE_COLORS.RED}✗${CONSOLE_COLORS.RESET} ${message}`, ...args);
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Clears the console
 */
export function clearConsole(): void {
  console.clear();
}
