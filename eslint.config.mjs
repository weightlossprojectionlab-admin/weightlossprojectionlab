import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import localRules from "./eslint-local-rules.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      // Dependencies
      'node_modules/**',
      '.pnpm-store/**',

      // Build outputs
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',

      // Testing
      'coverage/**',
      '.nyc_output/**',

      // Cache
      '.turbo/**',
      '.cache/**',
      '.parcel-cache/**',

      // Public assets
      'public/**',

      // Capacitor
      'android/**',
      'ios/**',
      'capacitor.config.*',

      // Scripts that might have intentional console.log
      'scripts/**',

      // Config files
      '*.config.js',
      '*.config.mjs',
      '*.config.ts'
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      'local': {
        rules: localRules
      }
    },
    rules: {
      // Local custom rules
      'local/no-hardcoded-colors': 'warn',

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn', // Warn on any type usage
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      // Console rules (warn for now, will be replaced with logger)
      'no-console': ['warn', {
        allow: ['warn', 'error'] // Allow console.warn and console.error temporarily
      }],

      // Code quality rules
      'no-debugger': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',

      // React/Next.js specific rules
      'react/no-unescaped-entities': 'warn',
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility rules
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error'
    }
  }
];

export default eslintConfig;
