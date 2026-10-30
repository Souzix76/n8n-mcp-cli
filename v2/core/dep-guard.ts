export class DependencyVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DependencyVersionError';
  }
}

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function loadPackageJson(): Promise<PackageJson> {
  try {
    // Use dynamic import to read package.json
    const fs = await import('node:fs');
    const path = await import('node:path');
    const packagePath = path.resolve(import.meta.dirname, '../../package.json');
    const content = fs.readFileSync(packagePath, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    // Fallback for different module structures
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const packagePath = path.resolve(process.cwd(), 'package.json');
      const content = fs.readFileSync(packagePath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch {
      throw new DependencyVersionError('Unable to load package.json');
    }
  }
}

export async function validateDependencies(): Promise<void> {
  const pkg = await loadPackageJson();
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  
  const zodVersion = allDeps['zod'];
  
  if (!zodVersion) {
    throw new DependencyVersionError(
      'Zod is not installed. Please install zod@3.x'
    );
  }
  
  // Check if zod version starts with 3. (major version 3)
  // Handle both exact versions (3.25.76) and range versions (^3.23.0, ~3.23.0, >=3.0.0)
  const majorVersion = zodVersion.replace(/^[\^~>=<]*(\d+)\..*$/, '$1');
  
  if (majorVersion !== '3') {
    throw new DependencyVersionError(
      `Zod version ${zodVersion} is not supported. This project requires zod@3.x (pinned to 3.25.76). ` +
      `Zod v4+ has breaking changes. See docs/MIGRATION_ZOD4.md for migration guide.`
    );
  }
  
  // Additional check: warn if not pinned to exact expected version
  const expectedVersion = '3.25.76';
  if (zodVersion !== expectedVersion && !zodVersion.startsWith('^') && !zodVersion.startsWith('~')) {
    console.warn(
      `Warning: Zod version ${zodVersion} differs from pinned version ${expectedVersion}. ` +
      `Consider updating package.json to use exact version.`
    );
  }
}

// Sync version for backward compatibility
export function validateDependenciesSync(): void {
  const fs = require('node:fs');
  const path = require('node:path');
  let packagePath: string;
  
  // Priority: process.cwd() first (respects test directory changes), then __dirname fallback
  try {
    packagePath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      packagePath = path.resolve(__dirname, '../../package.json');
    }
  } catch {
    packagePath = path.resolve(__dirname, '../../package.json');
  }
  
  const content = fs.readFileSync(packagePath, 'utf-8');
  const pkg = JSON.parse(content) as PackageJson;
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  
  const zodVersion = allDeps['zod'];
  
  if (!zodVersion) {
    throw new DependencyVersionError(
      'Zod is not installed. Please install zod@3.x'
    );
  }
  
  const majorVersion = zodVersion.replace(/^[\^~>=<]*(\d+)\..*$/, '$1');
  
  if (majorVersion !== '3') {
    throw new DependencyVersionError(
      `Zod version ${zodVersion} is not supported. This project requires zod@3.x (pinned to 3.25.76). ` +
      `Zod v4+ has breaking changes. See docs/MIGRATION_ZOD4.md for migration guide.`
    );
  }
}