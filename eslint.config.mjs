import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
  {
    // Isolation stricte : un configurateur ne doit jamais importer un autre via @/configurators/*.
    files: ["src/configurators/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/configurators/*"],
              message:
                "Isolation stricte : n'importez pas un autre configurateur. Utilisez @/core et des imports relatifs locaux.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
