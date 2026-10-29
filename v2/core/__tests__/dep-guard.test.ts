import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateDependencies, validateDependenciesSync, DependencyVersionError } from '../dep-guard.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('dep-guard', () => {
  const originalCwd = process.cwd();
  const testDir = path.join(originalCwd, '.test-dep-guard');
  const originalPackageJson = path.join(originalCwd, 'package.json');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.chdir(testDir);
  });
  
  afterEach(() => {
    process.chdir(originalCwd);
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  function writePackageJson(content: object) {
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(content, null, 2));
  }
  
  it('validateDependenciesSync passes with correct zod version (3.x)', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        zod: '3.25.76'
      }
    });
    
    expect(() => validateDependenciesSync()).not.toThrow();
  });
  
  it('validateDependenciesSync passes with zod range version (^3.x)', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        zod: '^3.23.0'
      }
    });
    
    expect(() => validateDependenciesSync()).not.toThrow();
  });
  
  it('validateDependenciesSync passes with zod tilde version (~3.x)', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        zod: '~3.23.0'
      }
    });
    
    expect(() => validateDependenciesSync()).not.toThrow();
  });
  
  it('validateDependenciesSync throws DependencyVersionError on zod v4', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        zod: '4.0.0'
      }
    });
    
    expect(() => validateDependenciesSync()).toThrow(DependencyVersionError);
    expect(() => validateDependenciesSync()).toThrow(/zod@3\.x/);
  });
  
  it('validateDependenciesSync throws DependencyVersionError on zod v5', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        zod: '5.0.0'
      }
    });
    
    expect(() => validateDependenciesSync()).toThrow(DependencyVersionError);
  });
  
  it('validateDependenciesSync throws DependencyVersionError when zod is missing', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {}
    });
    
    expect(() => validateDependenciesSync()).toThrow(DependencyVersionError);
    expect(() => validateDependenciesSync()).toThrow(/not installed/);
  });
  
  it('validateDependenciesSync throws DependencyVersionError when dependencies is missing', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0'
    });
    
    expect(() => validateDependenciesSync()).toThrow(DependencyVersionError);
  });
  
  it('validateDependenciesSync works with zod in devDependencies', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      devDependencies: {
        zod: '3.25.76'
      }
    });
    
    expect(() => validateDependenciesSync()).not.toThrow();
  });
  
  it('validateDependenciesSync works with zod in both dependencies and devDependencies', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        zod: '3.25.76'
      },
      devDependencies: {
        typescript: '^5.5.0'
      }
    });
    
    expect(() => validateDependenciesSync()).not.toThrow();
  });
  
  it('DependencyVersionError has correct name', () => {
    writePackageJson({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        zod: '4.0.0'
      }
    });
    
    try {
      validateDependenciesSync();
    } catch (e) {
      expect(e).toBeInstanceOf(DependencyVersionError);
      expect((e as Error).name).toBe('DependencyVersionError');
    }
  });
});