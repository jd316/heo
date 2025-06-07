module.exports = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8", // or 'babel' if you prefer
  preset: "ts-jest",
  testEnvironment: "jsdom", // Use jsdom for component testing
  setupFilesAfterEnv: ["./jest.setup.ts"], // Optional: for setup files like jest-dom for frontend
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',

    // Mock CSS imports (primarily for frontend components, good to have)
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",

    // Mock image imports (primarily for frontend components)
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
  },
  // Support tsx and jsx extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
  testPathIgnorePatterns: [
    '<rootDir>/src/app/components/__tests__/HypothesisGenerator.test.tsx',
    '<rootDir>/src/services/__tests__/hypothesisInternalHelpers.test.ts',
    '<rootDir>/src/services/__tests__/protocolService.test.ts',
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/out/",
    "<rootDir>/tests/e2e/",
  ],
  // Fix transform ignore patterns to handle ESM modules in node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(parse-duration|ipfs-http-client|ipfs-core-utils|multiformats|@ipld|cborg|dag-jose|uint8arrays|multiaddr|ipfs-unixfs|@google\/genai|@solana\/web3\.js|uuid|jayson|zod)/)'
  ],
  transform: {
    '^.+\\.([tj]sx?|mjs)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
        useESM: true,
      },
    ],
  },
  // Handle ES modules properly
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Consider adding coverage thresholds for production readiness
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 25,
      statements: 25,
    },
  },
};
