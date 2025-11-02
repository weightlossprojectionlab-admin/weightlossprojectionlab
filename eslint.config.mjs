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
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      'local': {
        rules: localRules
      }
    },
    rules: {
      'local/no-hardcoded-colors': 'warn', // Start with warning, can escalate to 'error' later
      '@typescript-eslint/no-explicit-any': 'warn' // Warn on any type usage
    }
  }
];

export default eslintConfig;
