const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const foodRoot = path.resolve(projectRoot, '../food');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo (frontend/shared, food, driver, etc.)
config.watchFolders = [monorepoRoot];

// 2. Resolve node_modules in priority order:
//    a) rider's own node_modules (highest priority — correct expo/react-native versions)
//    b) food's node_modules (fallback — for @expo/vector-icons and its deps)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(foodRoot, 'node_modules'),
];

// 3. Disable hierarchical lookup so Metro doesn't accidentally pick up
//    mismatched packages from root node_modules (e.g. react-native 0.84)
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
