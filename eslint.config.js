// @ts-check

import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: [
      'next/core-web-vitals',
      'next/typescript'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
          argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off'
    },
    ignorePatterns: [
      '.next/**/*',
      'node_modules/**/*',
      'circuits/**/*',
      '*.js',
      '*.mjs',
      'dist/**/*',
      'build/**/*'
    ]
  }),
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      '.next/**/*',
      'node_modules/**/*',
      'circuits/**/*',
      '**/*.js',
      '**/*.mjs'
    ]
  }
];

export default eslintConfig;
