import { createErrorResponse, safeAsyncHandler, isValidationError, throwValidationError, throwAuthenticationError, throwAuthorizationError, throwNotFoundError, ErrorCode, ApplicationError } from '../errorHandling';

// Mock logger to avoid real logging
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('errorHandling utilities', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createErrorResponse handles string input', () => {
    const resp = createErrorResponse('oops');
    expect(resp.success).toBe(false);
    expect(resp.error).toBe('oops');
    expect([undefined, ErrorCode.INTERNAL_ERROR]).toContain(resp.code);
    expect(typeof resp.timestamp).toBe('string');
  });

  test('createErrorResponse handles ApplicationError', () => {
    const appErr = new ApplicationError('bad', ErrorCode.VALIDATION_ERROR, { field: 'x' });
    const resp = createErrorResponse(appErr, ErrorCode.INTERNAL_ERROR);
    expect(resp.error).toBe('bad');
    expect(resp.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(resp.details).toEqual({ field: 'x' });
  });

  test('createErrorResponse handles generic Error', () => {
    const err = new Error('fail');
    const resp = createErrorResponse(err);
    expect(resp.error).toBe('fail');
    expect([undefined, ErrorCode.INTERNAL_ERROR]).toContain(resp.code);
  });

  test('safeAsyncHandler returns value on success', async () => {
    const result = await safeAsyncHandler(async () => 'ok');
    expect(result).toBe('ok');
  });

  test('safeAsyncHandler returns ApplicationError on throw', async () => {
    const result = await safeAsyncHandler(async () => { throw new Error('boom'); });
    expect(result).toBeInstanceOf(ApplicationError);
    if (result instanceof ApplicationError) {
      expect(result.message).toBe('boom');
      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
    }
  });

  test('safeAsyncHandler preserves ApplicationError', async () => {
    const custom = new ApplicationError('nope', ErrorCode.AUTHORIZATION_ERROR);
    const result = await safeAsyncHandler(async () => { throw custom; });
    expect(result).toBe(custom);
  });

  test('isValidationError identifies correctly', () => {
    expect(isValidationError(new ApplicationError('v', ErrorCode.VALIDATION_ERROR))).toBe(true);
    expect(isValidationError(new ApplicationError('x', ErrorCode.INTERNAL_ERROR))).toBe(false);
    expect(isValidationError(new Error('y'))).toBe(false);
  });

  test('throwValidationError throws ApplicationError', () => {
    expect(() => throwValidationError('bad', { a: 1 })).toThrow(ApplicationError);
    try {
      throwValidationError('bad', { a: 1 });
    } catch (e) {
      expect(e).toBeInstanceOf(ApplicationError);
      if (e instanceof ApplicationError) {
        expect(e.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(e.details).toEqual({ a: 1 });
      }
    }
  });

  test('throwAuthenticationError default message and code', () => {
    expect(() => throwAuthenticationError()).toThrow(ApplicationError);
    try { throwAuthenticationError(); } catch (e) {
      if (e instanceof ApplicationError) {
        expect(e.message).toBe('Authentication required');
        expect(e.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
      }
    }
  });

  test('throwAuthorizationError default message and code', () => {
    expect(() => throwAuthorizationError()).toThrow(ApplicationError);
    try { throwAuthorizationError(); } catch (e) {
      if (e instanceof ApplicationError) {
        expect(e.message).toBe('Permission denied');
        expect(e.code).toBe(ErrorCode.AUTHORIZATION_ERROR);
      }
    }
  });

  test('throwNotFoundError default message and code', () => {
    expect(() => throwNotFoundError()).toThrow(ApplicationError);
    try { throwNotFoundError(); } catch (e) {
      if (e instanceof ApplicationError) {
        expect(e.message).toBe('Resource not found');
        expect(e.code).toBe(ErrorCode.NOT_FOUND);
      }
    }
  });
}); 