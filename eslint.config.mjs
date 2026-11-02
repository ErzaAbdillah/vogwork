import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/.turbo/**",
    "apps/web/public/vendor/**",
    "apps/web/public/sw.js",
    "**/next-env.d.ts",
    "**/playwright-report/**",
    "**/test-results/**",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "apps/web/" } },
    rules: {
      // Pratinjau memakai blob: URL dari file pengguna; next/image tidak berguna di ekspor statis.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Aturan arsitektur: tool tidak boleh mengimpor tool lain.
    files: ["packages/tools/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@vogwork/tool-*"], message: "Tool tidak boleh mengimpor tool lain. Pindahkan logika bersama ke packages/." }] },
      ],
    },
  },
]);
