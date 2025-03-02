/**
 * Logger Utility
 *
 * Provides centralized logging capabilities for the Analytical MCP Server.
 * In a production environment, this would be connected to a proper logging service.
 */

/**
 * Log levels for differentiated logging
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  minLevel: LogLevel;
  includeTimestamp: boolean;
  includeStack: boolean;
}

/**
 * Logger utility class
 */
export class Logger {
  private static config: LoggerConfig = {
    minLevel: LogLevel.INFO, // Default, will be updated after config is loaded
    includeTimestamp: true,
    includeStack: true, // Default, will be updated after config is loaded
  };

  /**
   * Configure the logger
   * @param config Configuration options
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Initialize logger with environment configuration
   * @param nodeEnv Node environment
   * @param logLevel Log level from config
   */
  static initializeFromEnvironment(nodeEnv: string, logLevel: string): void {
    // Convert string log level to enum
    const configLogLevel =
      logLevel && LogLevel[logLevel as keyof typeof LogLevel]
        ? LogLevel[logLevel as keyof typeof LogLevel]
        : undefined;

    this.configure({
      minLevel: configLogLevel || (nodeEnv === 'production' ? LogLevel.INFO : LogLevel.DEBUG),
      includeStack: nodeEnv !== 'production',
      includeTimestamp: true,
    });

    // Log initialization
    this.debug(
      `Logger initialized in ${nodeEnv} environment with min level: ${this.config.minLevel}`
    );
  }

  /**
   * General log method
   * @param level Log level
   * @param message Message to log
   * @param meta Additional metadata
   */
  static log(level: LogLevel, message: string, meta?: any): void {
    // Skip if below minimum log level
    if (this.getLogLevelPriority(level) < this.getLogLevelPriority(this.config.minLevel)) {
      return;
    }

    const timestamp = this.config.includeTimestamp ? new Date().toISOString() : '';
    const prefix = timestamp ? `[${timestamp}] ${level}:` : `${level}:`;

    // Format metadata
    let metaStr = '';
    if (meta) {
      if (typeof meta === 'string') {
        metaStr = ` ${meta}`;
      } else if (meta instanceof Error) {
        metaStr = ` ${meta.message}`;
        if (this.config.includeStack && meta.stack) {
          metaStr += `\n${meta.stack}`;
        }
      } else {
        try {
          metaStr = ` ${JSON.stringify(meta, null, 2)}`;
        } catch (e) {
          metaStr = ` [Unstringifiable metadata: ${typeof meta}]`;
        }
      }
    }

    // In production, use proper logging service instead of console
    if (level === LogLevel.ERROR) {
      console.error(`${prefix} ${message}${metaStr}`);
    } else if (level === LogLevel.WARN) {
      console.warn(`${prefix} ${message}${metaStr}`);
    } else {
      console.log(`${prefix} ${message}${metaStr}`);
    }
  }

  /**
   * Log debug message
   * @param message Message to log
   * @param meta Additional metadata
   */
  static debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Log info message
   * @param message Message to log
   * @param meta Additional metadata
   */
  static info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log warning message
   * @param message Message to log
   * @param meta Additional metadata
   */
  static warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log error message
   * @param message Message to log
   * @param error Error object
   * @param meta Additional metadata
   */
  static error(message: string, error?: Error | unknown, meta?: any): void {
    const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;

    const combinedMeta = {
      ...(meta || {}),
      ...(errorObj
        ? {
            errorName: errorObj.name,
            errorMessage: errorObj.message,
            stack: errorObj.stack,
          }
        : {}),
    };

    this.log(LogLevel.ERROR, message, combinedMeta);
  }

  /**
   * Get numeric priority of log level for comparison
   * @param level Log level
   * @returns Numeric priority
   */
  private static getLogLevelPriority(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG:
        return 0;
      case LogLevel.INFO:
        return 1;
      case LogLevel.WARN:
        return 2;
      case LogLevel.ERROR:
        return 3;
      default:
        return 1;
    }
  }
}
