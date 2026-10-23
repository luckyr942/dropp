const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const frontendRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch shared components and store
config.watchFolders = [
  path.resolve(frontendRoot, 'shared'),
];

// Resolve driver node_modules first, fallback to frontend/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(frontendRoot, 'node_modules'),
];

// Prevent picking up mismatched root-level SDK 54 packages from monorepo root
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
