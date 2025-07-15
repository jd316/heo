import { logger } from './logger.ts';
/**
 * Error codes for consistent error handling
 */
export const ErrorCode = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    BAD_REQUEST: 'BAD_REQUEST',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};
/**
 * Maps error codes to HTTP status codes
 */
export const errorCodeToStatusCode = {
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.AUTHENTICATION_ERROR]: 401,
    [ErrorCode.AUTHORIZATION_ERROR]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.GATEWAY_TIMEOUT]: 504,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
};
/**
 * Custom error class for application errors
 */
export class ApplicationError extends Error {
    code;
    details;
    constructor(message, code = ErrorCode.INTERNAL_ERROR, details) {
        super(message);
        this.name = 'ApplicationError';
        this.code = code;
        this.details = details;
    }
}
/**
 * Creates a standardized error response for API endpoints
 */
export function createErrorResponse(error, defaultCode = ErrorCode.INTERNAL_ERROR) {
    let errorMessage;
    let errorCode = defaultCode;
    let errorDetails;
    if (typeof error === 'string') {
        errorMessage = error;
    }
    else if (error instanceof ApplicationError) {
        errorMessage = error.message;
        errorCode = error.code;
        errorDetails = error.details;
    }
    else {
        errorMessage = error.message || 'An unexpected error occurred';
    }
    // Log the error for internal tracking
    logger.error(`[${errorCode}] ${errorMessage}`, {
        errorDetails,
        stack: error instanceof Error ? error.stack : undefined,
    });
    return {
        success: false,
        error: errorMessage,
        code: errorCode,
        details: errorDetails,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Safely handles errors in async functions
 */
export async function safeAsyncHandler(fn, defaultErrorMessage = 'An unexpected error occurred') {
    try {
        return await fn();
    }
    catch (error) {
        logger.error(`Error in async handler: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof ApplicationError) {
            return error;
        }
        return new ApplicationError(error instanceof Error ? error.message : defaultErrorMessage, ErrorCode.INTERNAL_ERROR, error);
    }
}
/**
 * Determines if an error is a validation error
 */
export function isValidationError(error) {
    return (error instanceof ApplicationError &&
        error.code === ErrorCode.VALIDATION_ERROR);
}
/**
 * Helper to throw a validation error
 */
export function throwValidationError(message, details) {
    throw new ApplicationError(message, ErrorCode.VALIDATION_ERROR, details);
}
/**
 * Helper to throw an authentication error
 */
export function throwAuthenticationError(message = 'Authentication required') {
    throw new ApplicationError(message, ErrorCode.AUTHENTICATION_ERROR);
}
/**
 * Helper to throw an authorization error
 */
export function throwAuthorizationError(message = 'Permission denied') {
    throw new ApplicationError(message, ErrorCode.AUTHORIZATION_ERROR);
}
/**
 * Helper to throw a not found error
 */
export function throwNotFoundError(message = 'Resource not found') {
    throw new ApplicationError(message, ErrorCode.NOT_FOUND);
}
