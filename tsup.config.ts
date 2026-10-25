import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "core/index": "src/core/index.ts",
    "web/index": "src/web/index.ts",
    "core/legacy-swipe": "src/core/legacy-swipe.ts",
    "web/swipe-intent": "src/web/swipe-intent.ts",
    "web/compat": "src/web/compat.tsx",
    "web/css-motion": "src/web/css-motion.ts",
    "native/index": "src/native/index.ts",
    "presets/index": "src/presets/index.ts",
    "presets/generic": "src/presets/generic.ts",
    "presets/entrances": "src/presets/entrances.ts",
    "presets/text": "src/presets/text.ts",
    "presets/apple": "src/presets/apple.ts",
    "extensions/index": "src/extensions/index.ts",
    "integrations/react-router": "src/integrations/react-router.tsx",
    "integrations/react-navigation": "src/integrations/react-navigation.tsx",
    "integrations/expo-haptics": "src/integrations/expo-haptics.ts",
  },
  format: ["esm", "cjs"],
  dts: false,
  sourcemap: true,
  clean: true,
  // Public adapters must share their provider/host contexts across subpaths.
  splitting: true,
  minify: false,
  external: ["react", "react-dom", "framer-motion", "react-native",
    "react-native-reanimated", "react-native-worklets", "react-native-gesture-handler",
    "@radix-ui/react-dialog", "@radix-ui/react-popover", "react-router-dom",
    "@react-navigation/native", "expo-haptics"],
});
