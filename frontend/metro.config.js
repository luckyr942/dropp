const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname; // frontend/

const config = getDefaultConfig(projectRoot);

// Watch all sub-apps and shared within frontend/
config.watchFolders = [
    path.resolve(projectRoot, 'rider'),
    path.resolve(projectRoot, 'food'),
    path.resolve(projectRoot, 'driver'),
    path.resolve(projectRoot, 'seller'),
    path.resolve(projectRoot, 'shared'),
];

// Resolve packages from this root's node_modules first,
// then fall back to sub-app and workspace node_modules
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(projectRoot, 'driver/node_modules'),
    path.resolve(projectRoot, 'rider/node_modules'),
    path.resolve(projectRoot, 'food/node_modules'),
    path.resolve(projectRoot, 'seller/node_modules'),
    path.resolve(projectRoot, '../node_modules'),
];

// Prevent picking up mismatched root-level react-native
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
