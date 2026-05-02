import fs from 'fs';
import path from 'path';
import os from 'os';

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private logDir: string;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logDir = path.join(os.homedir(), 'AppData', 'Local', 'POSApp', 'logs');

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFile(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `pos-${date}.log`);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  private writeLog(level: LogLevel, message: string, data?: any): void {
    const formatted = this.formatMessage(level, message, data);

    // Console output
    const consoleMethod =
      level === LogLevel.ERROR
        ? console.error
        : level === LogLevel.WARN
        ? console.warn
        : console.log;

    if (this.isDevelopment || level === LogLevel.ERROR) {
      consoleMethod(formatted);
    }

    // File output
    try {
      fs.appendFileSync(this.getLogFile(), formatted + '\n');
    } catch (error) {
      console.error('Failed to write log file:', error);
    }
  }

  debug(message: string, data?: any): void {
    this.writeLog(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.writeLog(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.writeLog(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any): void {
    this.writeLog(LogLevel.ERROR, message, error);
  }
}

export const logger = new Logger();
