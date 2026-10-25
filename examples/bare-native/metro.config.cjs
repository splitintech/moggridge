const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const root = process.env.MOTION_PACKAGE_PATH
  ? path.resolve(process.env.MOTION_PACKAGE_PATH)
  : path.resolve(__dirname, "../..");
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [path.join(__dirname, "node_modules")],
    disableHierarchicalLookup: true,
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['require', 'react-native'],
    extraNodeModules: { '@splitin/react-mobile-interactions': root },
    resolveRequest(context, name, platform) {
      if (process.env.MOTION_PACKAGE_PATH && name.startsWith('@splitin/react-mobile-interactions/')) {
        const result = context.resolveRequest(context, name, platform);
        console.info('[motion-fixture] package export', name, result.filePath);
        return result;
      }
      if (name === "@splitin/react-mobile-interactions/native")
        return {
          type: "sourceFile",
          filePath: path.join(root, "src/native/index.ts"),
        };
      return context.resolveRequest(context, name, platform);
    },
  },
});
