export default {
	coverageDirectory: "coverage",
	moduleFileExtensions: ["js", "json", "node"],
	testEnvironment: "node",
	transform: {
		"^.+\\.js$": "babel-jest",
	},
};
