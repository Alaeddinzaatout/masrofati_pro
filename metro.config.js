const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// نضيف 'json' إلى sourceExts ليتعامل معها ككود وليس كأصول
config.resolver.sourceExts = [...config.resolver.sourceExts, 'json'];

module.exports = config;
