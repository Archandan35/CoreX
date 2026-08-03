export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/css/**'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...(await import('globals')).default.browser, ...(await import('globals')).default.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
      },
    },
    plugins: { react: (await import('eslint-plugin-react')).default, 'react-hooks': (await import('eslint-plugin-react-hooks')).default },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-extra-semi': 'warn',
      'no-cond-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'warn',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];