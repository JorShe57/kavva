import { log as viteLog } from '../vite';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

export class Logger {
  private prefix: string;
  
  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}]` : '';
  }
  
  private formatMessage(message: string): string {
    return this.prefix ? `${this.prefix} ${message}` : message;
  }
  
  private formatObject(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return `[Unstringifiable Object: ${Object.prototype.toString.call(obj)}]`;
    }
  }
  
  info(message: string | object): void {
    if (typeof message === 'string') {
      viteLog(this.formatMessage(message), LogLevel.INFO);
    } else {
      viteLog(`${this.formatMessage('Object:')} ${this.formatObject(message)}`, LogLevel.INFO);
    }
  }
  
  warn(message: string | object): void {
    if (typeof message === 'string') {
      viteLog(this.formatMessage(message), LogLevel.WARN);
    } else {
      viteLog(`${this.formatMessage('Object:')} ${this.formatObject(message)}`, LogLevel.WARN);
    }
  }
  
  error(message: string | Error | object): void {
    if (message instanceof Error) {
      const errorMsg = `${this.formatMessage('Error:')} ${message.message}\n${message.stack}`;
      viteLog(errorMsg, LogLevel.ERROR);
    } else if (typeof message === 'string') {
      viteLog(this.formatMessage(message), LogLevel.ERROR);
    } else {
      viteLog(`${this.formatMessage('Object:')} ${this.formatObject(message)}`, LogLevel.ERROR);
    }
  }
  
  debug(message: string | object): void {
    // Only log debug messages if NODE_ENV is not production
    if (process.env.NODE_ENV !== 'production') {
      if (typeof message === 'string') {
        viteLog(this.formatMessage(message), LogLevel.DEBUG);
      } else {
        viteLog(`${this.formatMessage('Object:')} ${this.formatObject(message)}`, LogLevel.DEBUG);
      }
    }
  }
  
  // Create a child logger with an extended prefix
  child(prefix: string): Logger {
    const newPrefix = this.prefix ? `${this.prefix.slice(1, -1)}:${prefix}` : prefix;
    return new Logger(newPrefix);
  }
}

// Create a default logger instance
export const logger = new Logger('App');