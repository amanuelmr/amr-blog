// ESLint flat config (ESLint 9+/10).
const nodeGlobals = {
  process: "readonly",
  console: "readonly",
  module: "writable",
  require: "readonly",
  exports: "writable",
  __dirname: "readonly",
  __filename: "readonly",
  Buffer: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
};

const jestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  beforeAll: "readonly",
  afterAll: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  jest: "readonly",
};

module.exports = [
  {
    ignores: ["node_modules/**", "coverage/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off",
    },
  },
  {
    files: ["tests/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: { ...nodeGlobals, ...jestGlobals },
    },
  },
];
