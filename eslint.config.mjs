import { createRequire } from "module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextParser from "eslint-config-next/parser";

const require = createRequire(import.meta.url);
const nextConfigRequire = createRequire(require.resolve("eslint-config-next/parser"));

const nextPlugin = nextConfigRequire("@next/eslint-plugin-next");
const reactPlugin = nextConfigRequire("eslint-plugin-react");
const reactHooksPlugin = nextConfigRequire("eslint-plugin-react-hooks");
const importPlugin = nextConfigRequire("eslint-plugin-import");
const jsxA11yPlugin = nextConfigRequire("eslint-plugin-jsx-a11y");
const globals = nextConfigRequire("globals");

// Assemble Next.js core-web-vitals JS rules without importing
// eslint-config-next/core-web-vitals, which eagerly loads typescript-eslint
// and requires typescript even in pure-JS projects.
const eslintConfig = defineConfig([
  {
    name: "next",
    files: ["**/*.{js,jsx,mjs}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      import: importPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parser: nextParser,
      parserOptions: {
        requireConfigFile: false,
        sourceType: "module",
        allowImportExportEverywhere: true,
        babelOptions: {
          presets: ["next/babel"],
          caller: {
            supportsTopLevelAwait: true,
          },
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".mjs"],
        },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "import/no-anonymous-default-export": "warn",
      "react/no-unknown-property": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "jsx-a11y/alt-text": [
        "warn",
        {
          elements: ["img"],
          img: ["Image"],
        },
      ],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "react/jsx-no-target-blank": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
