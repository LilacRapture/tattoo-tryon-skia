// Enable bundling of .npy assets so we can require them from JS
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('npy');

module.exports = config;
