const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Explicitly set projectRoot so Metro doesn't auto-compute it as the
// common ancestor of watchFolders (which would be the monorepo root)
config.projectRoot = projectRoot;

// Watch monorepo root for shared packages and hoisted deps
config.watchFolders = [monorepoRoot];

// Exclude directories Metro doesn't need to scan
config.resolver.blockList = [
  // Exclude other apps (server, web) from bundling
  new RegExp(path.resolve(monorepoRoot, 'apps/server').replace(/[/\\]/g, '[/\\\\]') + '/.*'),
  new RegExp(path.resolve(monorepoRoot, 'apps/web').replace(/[/\\]/g, '[/\\\\]') + '/.*'),
  // Exclude .git
  /\.git\/.*/,
  // Exclude android/ios build dirs within mobile
  new RegExp(path.resolve(projectRoot, 'android/app/build').replace(/[/\\]/g, '[/\\\\]') + '/.*'),
  new RegExp(path.resolve(projectRoot, 'ios/Pods').replace(/[/\\]/g, '[/\\\\]') + '/.*'),
  new RegExp(path.resolve(projectRoot, 'ios/build').replace(/[/\\]/g, '[/\\\\]') + '/.*'),
];

// Resolve node_modules from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure .ts/.tsx files are resolved
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

// Handle ESM-style .js imports that point to .ts source files
// (e.g., import from './constants/media.js' -> resolves to media.ts)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.js')) {
    const tsName = moduleName.replace(/\.js$/, '.ts');
    try {
      if (originalResolveRequest) {
        return originalResolveRequest(context, tsName, platform);
      }
      return context.resolveRequest(context, tsName, platform);
    } catch {
      // Fall through to default resolution
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
