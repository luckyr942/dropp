const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const frontendRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch shared components and theme
config.watchFolders = [
  path.resolve(frontendRoot, 'shared'),
];

// Resolve frontend/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(frontendRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
