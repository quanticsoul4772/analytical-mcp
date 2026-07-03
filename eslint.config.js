// ESLint Flat Config
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // console.error/warn write to stderr (safe); console.log/info/debug write to
      // stdout, which is the MCP JSON-RPC channel and must never be used.
      'no-console': ['warn', { allow: ['error', 'warn'] }]
    }
  }
];
