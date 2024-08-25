module.exports = {
	clearMocks: true,
	coverageDirectory: "coverage",
	moduleFileExtensions: ["js", "json", "node", "ts"],
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.js", "**/*.spec.js", "**/*.*_test.js", "**/*.*_test.ts"],
	testPathIgnorePatterns: ["/node_modules/", "/build/"],
};
