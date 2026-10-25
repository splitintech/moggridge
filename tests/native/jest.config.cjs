const path = require("path");
const fixture = path.resolve(__dirname, "../../examples/native");
module.exports = {
  rootDir: path.resolve(__dirname, "../.."),
  resolver: "<rootDir>/tests/native/resolver.cjs",
  preset: require.resolve("@react-native/jest-preset", { paths: [fixture] }),
  testMatch: ["<rootDir>/tests/native/**/*.test.tsx"],
  setupFiles: [
    "<rootDir>/tests/native/setup.cjs",
    require.resolve("react-native-gesture-handler/jestSetup", {
      paths: [fixture],
    }),
  ],
  moduleDirectories: [path.join(fixture, "node_modules"), "node_modules"],
  moduleNameMapper: {
    "^react$": path.join(fixture, "node_modules/react"),
    "^react/jsx-runtime$": path.join(fixture, "node_modules/react/jsx-runtime"),
    "^react-native$": path.join(fixture, "node_modules/react-native"),
    "^react-native-reanimated$": path.join(
      fixture,
      "node_modules/react-native-reanimated",
    ),
    "^react-native-gesture-handler$": path.join(
      fixture,
      "node_modules/react-native-gesture-handler",
    ),
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|react-native-reanimated|react-native-gesture-handler|react-native-worklets)/)",
  ],
  transform: {
    "^.+\\.(js|ts|tsx)$": [
      require.resolve("babel-jest", { paths: [fixture] }),
      {
        presets: [
          require.resolve("@react-native/babel-preset", { paths: [fixture] }),
        ],
      },
    ],
  },
};
