const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const frontendRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch project root and shared components
config.watchFolders = [
  projectRoot,
  path.resolve(frontendRoot, 'shared'),
];

// Resolve frontend/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(frontendRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;

