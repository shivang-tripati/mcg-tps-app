const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const path = require('path');

let config = getDefaultConfig(__dirname);

// ADD THIS SECTION:
config.resolver.extraNodeModules = {
    'react-native-worklets': path.resolve(__dirname, 'node_modules/react-native-worklets'),
};

config = withNativeWind(config, { input: "./global.css" });

module.exports = wrapWithReanimatedMetroConfig(config);