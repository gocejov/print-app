import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['**/node_modules/**', 'dist/**', 'public/admin/**', 'uploads/**', 'client/test-results/**', 'client/playwright-report/**', 'initial-data/**', 'postman/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    files: ['src/**/*.ts'],
    rules: {
      // Existing controllers expose loose Mongoose/request types and legacy interfaces.
      // Keep correctness checks active without making this pipeline a type migration.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  { files: ['tests/**/*.{js,cjs}', '*.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
)
