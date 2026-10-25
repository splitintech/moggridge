const rnResolver = require("../../examples/native/node_modules/@react-native/jest-preset/jest/resolver.js");
const animationResolver = require("../../examples/native/node_modules/react-native-reanimated/jest/resolver.js");
module.exports = (request, options) =>
  animationResolver(request, {
    ...options,
    defaultResolver: (name, adjusted) =>
      rnResolver(name, {
        ...adjusted,
        defaultResolver: options.defaultResolver,
      }),
  });
