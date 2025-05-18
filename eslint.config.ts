import {defineConfig, globalIgnores} from 'eslint/config'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import prettier from 'eslint-plugin-prettier'
import js from '@eslint/js'
import {FlatCompat} from '@eslint/eslintrc'
import type {ESLint} from 'eslint'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default defineConfig([
  {
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {},

      globals: {
        ...globals.browser,
        ...globals.jest
      }
    },

    extends: compat.extends(
      'eslint:recommended',
      'plugin:prettier/recommended',
      'plugin:@typescript-eslint/recommended'
    ),

    plugins: {
      '@typescript-eslint': typescriptEslint as unknown as ESLint.Plugin,
      prettier
    },

    rules: {
      'prettier/prettier': 'error'
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.node
      },

      sourceType: 'script',
      parserOptions: {}
    },

    files: ['**/.eslintrc.{js,cjs}']
  },
  globalIgnores([
    '**/dist/',
    '**/lib/',
    '**/node_modules/',
    '**/eslint.config.ts',
    '**/jest.config.ts',
    '**/lint-staged.config.js',
    '**/prettier.config.js'
  ])
])
