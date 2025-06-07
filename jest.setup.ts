/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom";

// Polyfill fetch, Request, and Response in jsdom environment
import 'whatwg-fetch';

// Polyfill setImmediate in jsdom environment
(global as any).setImmediate = global.setImmediate || ((fn: any) => setTimeout(fn, 0));

// Polyfill TextEncoder and TextDecoder
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Monkey-patch NextResponse to support instance.json()
import { NextResponse } from 'next/server';
;(NextResponse as any).prototype.json = function() {
  return this.text().then(JSON.parse);
};

// Mock @google/genai to prevent ESM import errors during Jest tests
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({})),
}));
