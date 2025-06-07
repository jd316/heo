import * as winston from "winston";
import type { Logform } from "winston";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Winston's info object that printf receives
interface PrintfInfo extends Logform.TransformableInfo {
  timestamp?: string; // Added by the timestamp formatter
  stack?: string; // Added by the errors formatter
  // level, message are inherent from Logform.TransformableInfo
  // Ensure message is treated as unknown to handle various types
  message: unknown;
}

const logFormat = printf((info: PrintfInfo) => {
  const { level, message, timestamp: ts, stack, ...metadata } = info;

  const sLevel = String(level);
  const sMessage =
    typeof message === "string" ? message : JSON.stringify(message);
  const sTs = String(ts || ""); // Ensure ts is a string, default to empty if undefined
  const sStack = stack ? `\n${String(stack)}` : "";

  let log = `${sTs} ${sLevel}: ${sMessage}`;
  if (sStack) {
    log += sStack;
  }

  // Filter out internal Winston symbols like 'splat' before stringifying metadata
  const filteredMetadata = Object.entries(metadata).reduce(
    (acc, [key, value]) => {
      if (typeof key !== "symbol" && key !== "splat") {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );

  if (Object.keys(filteredMetadata).length > 0) {
    log += ` ${JSON.stringify(filteredMetadata)}`;
  }
  return log;
});

const createLogger = (): winston.Logger => {
  const loggerInstance = winston.createLogger({
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    format: combine(
      errors({ stack: true }), // This adds the 'stack' to the info object if an error is passed
      timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSSZ" }), // Adds 'timestamp'
    ),
    transports: [],
  });

  if (process.env.NODE_ENV !== "production") {
    loggerInstance.add(
      new winston.transports.Console({
        format: combine(
          colorize(), // Colorizes the output
          logFormat, // Our custom format
        ),
      }),
    );
  } else {
    // For production: log to console with JSON format
    loggerInstance.add(
      new winston.transports.Console({
        format: combine(
          // json() format handles timestamp, level, message, and metadata automatically.
          // It also correctly handles Symbols and other non-JSON-friendly properties.
          json(),
        ),
      }),
    );
    // In a real production environment, you would add transports for persistent log storage:
    // loggerInstance.add(new winston.transports.File({ filename: 'heo-error.log', level: 'error' }));
    // loggerInstance.add(new winston.transports.File({ filename: 'heo-combined.log' }));
    // Or a transport for a cloud logging service.
  }

  return loggerInstance;
};

export const logger = createLogger();

logger.info("Winston logger initialized.", {
  environment: process.env.NODE_ENV || "development",
});

// Override console.log, console.warn, etc. to use Winston for unified logging
// This helps capture logs from dependencies that use console directly.
// Be cautious with this in library code, but for an application, it can be useful.
// console.log = (...args: any[]) => logger.info.apply(logger, args as [string, ...any[]]);
// console.info = (...args: any[]) => logger.info.apply(logger, args as [string, ...any[]]);
// console.warn = (...args: any[]) => logger.warn.apply(logger, args as [string, ...any[]]);
// console.error = (...args: any[]) => logger.error.apply(logger, args as [string, ...any[]]);
// console.debug = (...args: any[]) => logger.debug.apply(logger, args as [string, ...any[]]);
