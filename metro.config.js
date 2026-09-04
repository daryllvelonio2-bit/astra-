const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Stub Node core modules referenced (but never executed on-device) by bundled
// libraries such as the TypeScript compiler used for editor diagnostics.
const emptyShim = path.resolve(__dirname, "metro-shims/empty.js");
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  fs: emptyShim,
  os: emptyShim,
  path: emptyShim,
  crypto: emptyShim,
  inspector: emptyShim,
  perf_hooks: emptyShim,
};

module.exports = config;
