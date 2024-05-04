module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  overrides: [
    {
      env: {
        node: true
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  ignorePatterns: ['.eslintrc.js', 'jest.config.ts', 'lint-staged.config.js'],
  rules: {
    'prettier/prettier': 'error'
  }
}
