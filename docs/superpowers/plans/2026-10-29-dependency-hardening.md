# Task 3: Dependency Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden dependency management by pinning Zod v3, adding runtime version validation (dep-guard), and setting up scheduled CI dependency checks with PR validation.

**Architecture:** Add a runtime guard (`dep-guard.ts`) that validates dependency versions on startup, pin Zod to 3.x with explicit version, create a GitHub Actions workflow that runs on schedule and PR to detect outdated/vulnerable deps, and document Zod v4 migration path.

**Tech Stack:** Node.js 20+, TypeScript 5.5, Vitest 2, GitHub Actions, npm audit, dependabot-compatible workflow

**Spec:** `/root/.hermes/workspace/n8n-mcp-cli/.vibe-checklist.md` (Task 3 section)

## Global Constraints
- Zod MUST remain on 3.x (v4 has breaking changes — migration documented separately)
- All new code in `v2/` directory
- Tests in `__tests__/` alongside source
- TDD: write failing test first, then implement, then verify pass
- Commit after each task with conventional message

## Review Focus
1. **Missing @types/node** — CLI path imports fail without it; test: import succeeds in `v2/cli/commands.ts`
2. **Zod version drift** — `^3.23.0` allows minor updates that could break; test: `dep-guard` rejects non-3.x
3. **Vulnerable transitive deps** — `npm audit` must pass in CI; test: workflow fails on high/critical
4. **Outdated deps on PR** — workflow must detect and comment; test: PR with bumped dep shows warning
5. **Runtime startup failure** — `dep-guard` must throw clear error if versions mismatch; test: mocked wrong version throws

---

### Task 3.1: Audit package.json deps vs latest & pin Zod

**Files:**
- Modify: `package.json` (pin zod, add @types/node)
- Test: `v2/core/__tests__/dep-guard.test.ts` (will be created in 3.3)

**Interfaces:**
- Consumes: current `package.json`
- Produces: pinned `zod@3.23.8` (latest 3.x), `@types/node@^20` in devDependencies

- [ ] **Step 1: Check latest Zod 3.x version**
  Run: `npm view zod versions --json | jq '.[] | select(startswith("3.")) | select(. | contains("-") | not)' | tail -1`
  Expected: `3.23.8` (or latest 3.x patch)

- [ ] **Step 2: Update package.json**
  - Change `zod`: `"^3.23.0"` → `"3.23.8"` (exact pin)
  - Add `@types/node`: `"^20.14.0"` to devDependencies
  - Bump `version` to `"2.1.9"` (match manifest.json)

- [ ] **Step 3: Install and verify**
  Run: `npm install`
  Expected: clean install, no peer dep warnings

- [ ] **Step 4: Run full test suite**
  Run: `npm test`
  Expected: 73 tests pass

- [ ] **Step 5: Type check**
  Run: `npx tsc --noEmit`
  Expected: clean

- [ ] **Step 6: Commit**
  ```bash
  git add package.json package-lock.json
  git commit -m "feat: Task 3.1 - Pin Zod v3.23.8, add @types/node, bump version to 2.1.9"
  ```

---

### Task 3.2: Create v2/core/dep-guard.ts (runtime version validation)

**Files:**
- Create: `v2/core/dep-guard.ts`
- Create: `v2/core/__tests__/dep-guard.test.ts`
- Modify: `v2/core/index.ts` (export)

**Interfaces:**
- Consumes: `package.json` (read at runtime)
- Produces: `validateDependencies(): void` — throws `DependencyVersionError` if mismatch

- [ ] **Step 1: Write failing test**
  ```typescript
  // v2/core/__tests__/dep-guard.test.ts
  import { validateDependencies, DependencyVersionError } from '../dep-guard.js';
  import { readFileSync } from 'node:fs';
  
  test('validateDependencies passes with correct zod version', () => {
    // Mock package.json with correct zod version
    expect(() => validateDependencies()).not.toThrow();
  });
  
  test('validateDependencies throws on zod v4', () => {
    // Mock package.json with zod 4.x
    expect(() => validateDependencies()).toThrow(DependencyVersionError);
  });
  
  test('validateDependencies throws on missing zod', () => {
    // Mock package.json without zod
    expect(() => validateDependencies()).toThrow(DependencyVersionError);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run v2/core/__tests__/dep-guard.test.ts`
  Expected: FAIL (module not found)

- [ ] **Step 3: Implement `v2/core/dep-guard.ts`**
  ```typescript
  export class DependencyVersionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DependencyVersionError';
    }
  }
  
  export function validateDependencies(): void {
    // Read package.json, parse, check zod version starts with "3."
    // Throw DependencyVersionError with clear message if not
  }
  ```
  Approach: Use `import.meta.resolve` or `fs.readFileSync` to load package.json, parse semver, validate zod major version === 3.

- [ ] **Step 4: Export from `v2/core/index.ts`**
  Add: `export { validateDependencies, DependencyVersionError } from './dep-guard.js';`

- [ ] **Step 5: Run test to verify it passes**
  Run: `npx vitest run v2/core/__tests__/dep-guard.test.ts`
  Expected: PASS

- [ ] **Step 6: Run full test suite**
  Run: `npm test`
  Expected: 74+ tests pass

- [ ] **Step 7: Commit**
  ```bash
  git add v2/core/dep-guard.ts v2/core/__tests__/dep-guard.test.ts v2/core/index.ts
  git commit -m "feat: Task 3.2 - Add dep-guard runtime version validation"
  ```

---

### Task 3.3: Create .github/workflows/dep-check.yml (scheduled + PR)

**Files:**
- Create: `.github/workflows/dep-check.yml`

**Interfaces:**
- Consumes: `package.json`, `package-lock.json`
- Produces: GitHub Actions workflow running `npm audit`, `npm outdated`, dependabot alerts

- [ ] **Step 1: Write workflow file**
  ```yaml
  name: Dependency Check
  on:
    schedule:
      - cron: '0 6 * * 1'  # Weekly Monday 6am UTC
    pull_request:
      paths:
        - 'package.json'
        - 'package-lock.json'
    workflow_dispatch:
  
  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
        - run: npm ci
        - run: npm audit --audit-level=high
          continue-on-error: false
  
    outdated:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
        - run: npm ci
        - run: npm outdated --json > outdated.json || true
        - name: Comment on PR
          if: github.event_name == 'pull_request'
          uses: actions/github-script@v7
          with:
            script: |
              const fs = require('fs');
              const outdated = JSON.parse(fs.readFileSync('outdated.json', 'utf8'));
              if (outdated.length > 0) {
                const body = '## ⚠️ Outdated Dependencies\n\n' + outdated.map(d => `- **${d.name}**: ${d.current} → ${d.latest} (wanted: ${d.wanted})`).join('\n');
                github.rest.issues.createComment({
                  issue_number: context.issue.number,
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  body
                });
              }
  ```

- [ ] **Step 2: Verify workflow syntax**
  Run: `npx yaml-lint .github/workflows/dep-check.yml` (or push and check Actions tab)

- [ ] **Step 3: Commit**
  ```bash
  git add .github/workflows/dep-check.yml
  git commit -m "feat: Task 3.3 - Add scheduled + PR dependency check workflow"
  ```

---

### Task 3.4: Create docs/MIGRATION_ZOD4.md

**Files:**
- Create: `docs/MIGRATION_ZOD4.md`

**Interfaces:**
- Consumes: Zod v3 → v4 migration knowledge
- Produces: Migration guide for future upgrade

- [ ] **Step 1: Write migration doc**
  Key sections:
  - Why we're pinned to v3 (breaking changes in v4)
  - Major v4 changes: `z.enum` → `z.enum`, `z.object` shape changes, `.parse`/`.safeParse` behavior, `z.infer` changes
  - Codemod availability: `npx @zod/zod-codemod@latest`
  - Test strategy: run full suite after codemod, fix failures
  - Rollback plan: `git revert` + `npm install zod@3.23.8`

- [ ] **Step 2: Commit**
  ```bash
  git add docs/MIGRATION_ZOD4.md
  git commit -m "feat: Task 3.4 - Add Zod v4 migration guide"
  ```

---

### Task 3.5: Integration test & final verification

**Files:**
- Test: Run all

- [ ] **Step 1: Run full test suite**
  Run: `npm test`
  Expected: All tests pass (including new dep-guard tests)

- [ ] **Step 2: Type check**
  Run: `npx tsc --noEmit`
  Expected: Clean

- [ ] **Step 3: Test dep-guard at runtime**
  Run: `node -e "import('./v2/core/dep-guard.js').then(m => m.validateDependencies())"`
  Expected: No error thrown

- [ ] **Step 4: Simulate version mismatch**
  Temporarily modify package.json zod to 4.0.0, run dep-guard, verify error, restore

- [ ] **Step 5: Commit final**
  ```bash
  git add -A
  git commit -m "feat: Task 3 - Dependency hardening complete"
  ```

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-29-dependency-hardening.md`. Please review the plan. Does it capture what you want?**