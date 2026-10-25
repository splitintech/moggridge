const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
const packageRoot = process.env.MOTION_PACKAGE_PATH
  ? path.resolve(process.env.MOTION_PACKAGE_PATH)
  : path.resolve(__dirname, "../..");
config.watchFolders = [packageRoot];
config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules")];
config.resolver.disableHierarchicalLookup = false;
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [...new Set([...(config.resolver.unstable_conditionNames || []), 'react-native'])];
config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules || {}), '@splitin/react-mobile-interactions': packageRoot };
const reported = new Set();
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (process.env.MOTION_PACKAGE_PATH && moduleName.startsWith('@splitin/react-mobile-interactions/')) {
    const result = context.resolveRequest(context, moduleName, platform);
    if (!reported.has(moduleName)) { reported.add(moduleName); console.info('[motion-fixture] package export', moduleName, result.filePath); }
    return result;
  }
  if (moduleName === "@splitin/react-mobile-interactions/core")
    return {
      type: "sourceFile",
      filePath: path.join(packageRoot, "src/core/index.ts"),
    };
  if (moduleName === "@splitin/react-mobile-interactions/native")
    return {
      type: "sourceFile",
      filePath: path.join(packageRoot, "src/native/index.ts"),
    };
  if (
    !context.originModulePath.startsWith(__dirname) &&
    !moduleName.startsWith(".")
  ) {
    const pinned = {
      ...context,
      disableHierarchicalLookup: true,
      nodeModulesPaths: [path.join(__dirname, "node_modules")],
    };
    return context.resolveRequest(pinned, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
