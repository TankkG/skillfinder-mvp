
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Excluir herramientas y archivos de monitoreo.
// Metro no debe leer los ZIP ni binarios de Grafana y Prometheus.
config.resolver.blockList = [
  /[/\\]\.tools[/\\].*/,
  /[/\\]\.local-data[/\\].*/,
];

module.exports = config;
