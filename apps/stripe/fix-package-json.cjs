#!/usr/bin/env node

/**
 * Fix package.json for Docker builds by replacing monorepo-specific dependencies
 * This script replaces catalog: and workspace: dependencies with compatible versions
 */

const fs = require('fs');
const path = require('path');

// Mapping of catalog dependencies to actual versions
const catalogMapping = {
  // OpenTelemetry packages
  '@opentelemetry/api': '^1.9.0',
  '@opentelemetry/api-logs': '^0.57.2',
  '@opentelemetry/exporter-trace-otlp-http': '^0.57.2',
  '@opentelemetry/exporter-metrics-otlp-http': '^0.57.2',
  '@opentelemetry/instrumentation': '^0.57.2',
  '@opentelemetry/instrumentation-aws-sdk': '^0.49.1',
  '@opentelemetry/instrumentation-http': '^0.57.2',
  '@opentelemetry/resources': '^1.30.1',
  '@opentelemetry/sdk-logs': '^0.57.2',
  '@opentelemetry/sdk-trace-node': '^1.30.1',
  '@opentelemetry/semantic-conventions': '^1.30.0',
  '@opentelemetry/sdk-metrics': '^1.30.1',
  // Vercel and monitoring
  '@vercel/otel': '^1.10.1',
  // Sentry
  '@sentry/cli': '^1.77.3',
  '@sentry/nextjs': '^9.8.0',
  // Core frameworks
  'next': '^15.2.4',
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  // Saleor packages
  '@saleor/macaw-ui': '^1.1.10',
  '@saleor/app-sdk': '^1.0.5',
  // TRPC
  '@trpc/client': '^10.43.1',
  '@trpc/next': '^10.43.1',
  '@trpc/server': '^10.43.1',
  '@trpc/react-query': '^10.43.1',
  // GraphQL & utilities
  'urql': '^4.0.4',
  'zod': '^3.21.4',
  // Linting
  'eslint': '^9.23.0',
};

// Mock workspace dependencies (these will be skipped or replaced)
const workspaceSkips = [
  '@saleor/apps-logger',
  '@saleor/apps-otel',
  '@saleor/apps-shared',
  '@saleor/apps-trpc',
  '@saleor/apps-ui',
  '@saleor/app-sdk',
  '@saleor/react-hook-form-macaw',
  '@saleor/eslint-config-apps',
  '@saleor/sentry-utils',
  '@saleor/typescript-config-apps',
  '@saleor/webhook-utils'
];

function fixPackageJson(packageJsonPath) {
  console.log(`Fixing ${packageJsonPath}...`);
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  let modified = false;

  // Fix dependencies
  if (packageJson.dependencies) {
    for (const [name, version] of Object.entries(packageJson.dependencies)) {
      if (version === 'catalog:' && catalogMapping[name]) {
        packageJson.dependencies[name] = catalogMapping[name];
        modified = true;
        console.log(`  Fixed catalog dependency: ${name} -> ${catalogMapping[name]}`);
      } else if (version.startsWith('workspace:') || version.startsWith('link:')) {
        // Remove all workspace dependencies that can't be resolved in Docker
        delete packageJson.dependencies[name];
        modified = true;
        console.log(`  Removed workspace dependency: ${name}`);
      }
    }
  }

  // Fix devDependencies
  if (packageJson.devDependencies) {
    for (const [name, version] of Object.entries(packageJson.devDependencies)) {
      if (version === 'catalog:' && catalogMapping[name]) {
        packageJson.devDependencies[name] = catalogMapping[name];
        modified = true;
        console.log(`  Fixed catalog devDependency: ${name} -> ${catalogMapping[name]}`);
      } else if (version.startsWith('workspace:') || version.startsWith('link:')) {
        // Remove all workspace devDependencies that can't be resolved in Docker
        delete packageJson.devDependencies[name];
        modified = true;
        console.log(`  Removed workspace devDependency: ${name}`);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`  ✅ Fixed ${packageJsonPath}`);
  } else {
    console.log(`  ℹ️  No changes needed for ${packageJsonPath}`);
  }

  return modified;
}

// Main execution
const packageJsonPaths = process.argv.slice(2);

if (packageJsonPaths.length === 0) {
  console.log('Usage: node fix-package-json.js <path-to-package.json> [<path-to-package.json> ...]');
  process.exit(1);
}

let totalFixed = 0;
for (const packageJsonPath of packageJsonPaths) {
  if (fs.existsSync(packageJsonPath)) {
    if (fixPackageJson(packageJsonPath)) {
      totalFixed++;
    }
  } else {
    console.log(`❌ File not found: ${packageJsonPath}`);
  }
}

console.log(`\n🎉 Fixed ${totalFixed} package.json files`);