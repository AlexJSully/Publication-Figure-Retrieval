const eslintPluginPrettier = require("eslint-plugin-prettier");
const globals = require("globals");
const eslintPluginNode = require("eslint-plugin-node");

module.exports = [
	{
		ignores: ["**/*.min.js", ".vscode/**/*", "eslint.config.js", "node_modules/**/*"],
	},
	{
		languageOptions: {
			ecmaVersion: "latest",
			globals: {
				...globals.browser,
			},
			parserOptions: {
				ecmaFeatures: {
					modules: true,
				},
			},
		},
		plugins: {
			node: eslintPluginNode,
			prettier: eslintPluginPrettier,
		},
		rules: {
			"class-methods-use-this": "off",
			"consistent-return": "off",
			indent: ["error", "tab"],
			"no-console": "off",
			"no-continue": "off",
			"no-html-link-for-pages": "off",
			"no-param-reassign": "off",
			"no-restricted-syntax": "off",
			"no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			"prettier/prettier": "warn",
			radix: "off",
			semi: ["error", "always"],
		},
	},
];
