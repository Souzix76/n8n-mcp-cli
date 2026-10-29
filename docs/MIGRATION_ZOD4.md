# Zod v4 Migration Guide

## Why We're Pinned to Zod v3

This project pins `zod@3.25.76` (exact version) because Zod v4 introduces **breaking changes** that require significant code migration. The v3.x line will continue to receive security patches.

**Current status**: `zod@3.25.76` (latest 3.x as of 2026-10-29)

---

## Major Breaking Changes in Zod v4

### 1. `z.enum` and `z.nativeEnum` Changes
```typescript
// v3
z.enum(['a', 'b'] as const)
z.nativeEnum(MyEnum)

// v4 - enums now require explicit values
z.enum({ a: 'a', b: 'b' })
// or use z.union with literals
z.union([z.literal('a'), z.literal('b')])
```

### 2. `.parse()` vs `.safeParse()` Behavior
```typescript
// v3 - parse throws, safeParse returns { success, data/error }
schema.parse(input) // throws ZodError
schema.safeParse(input) // { success: false, error: ZodError }

// v4 - safeParse returns ZodError directly on failure
schema.safeParse(input) // { success: false, error: ZodError } (same)
// but error formatting changed
```

### 3. `z.infer` Type Changes
```typescript
// v3 - infer works with const assertions
const schema = z.object({ name: z.string() });
type T = z.infer<typeof schema>; // { name: string }

// v4 - stricter inference, may need explicit types
```

### 4. Discriminated Unions
```typescript
// v3
z.discriminatedUnion('type', [
  z.object({ type: z.literal('a'), a: z.string() }),
  z.object({ type: z.literal('b'), b: z.number() })
])

// v4 - similar but stricter on discriminant values
```

### 5. Coercion Changes
```typescript
// v3
z.coerce.string()
z.coerce.number()

// v4 - coerce moved to separate namespace
z.coerce.string() // still works but implementation changed
```

### 6. Error Formatting
```typescript
// v3
error.format() // nested object
error.flatten() // { fieldErrors, formErrors }

// v4 - different error shape, .format() may not exist
```

### 7. Custom Schemas / `z.custom()`
```typescript
// v3
z.custom<Date>(val => val instanceof Date)

// v4 - refined API
```

### 8. Removed/Deprecated Features
- `z.any()` → use `z.unknown()` with refinement
- `z.never()` behavior changes
- `z.void()` behavior changes
- Some `z.preprocess()` patterns

---

## Migration Strategy

### Phase 1: Automated Codemod (Recommended First Step)
```bash
# Run the official Zod v4 codemod
npx @zod/zod-codemod@latest

# This will:
# - Convert enum syntax
# - Update discriminated unions
# - Fix common patterns
# - Flag manual changes needed
```

### Phase 2: Manual Fixes
After codemod, check and fix:

1. **Test Suite**: Run full test suite (`npm test`)
   - Fix any failing tests
   - Update test expectations for error formats

2. **Type Checking**: Run `npx tsc --noEmit`
   - Fix type errors from `z.infer` changes
   - Update explicit type annotations

3. **Runtime Validation**: Test actual validation flows
   - Check `.parse()` vs `.safeParse()` handling
   - Verify error messages in UI/logs

### Phase 3: Dependency Updates
```bash
# Update package.json
npm install zod@4.x.x --save-exact

# Update devDependencies if needed
npm install @types/node@latest --save-dev
```

### Phase 4: Validation
- Run full test suite: `npm test` (should pass 83+ tests)
- Run type check: `npx tsc --noEmit` (clean)
- Run dep-guard: `npx tsx v2/core/dep-guard.ts` (should need update for v4)

---

## Rollback Plan

If migration causes critical issues:

```bash
# 1. Revert package.json
git checkout HEAD -- package.json package-lock.json

# 2. Reinstall pinned version
npm ci

# 3. Revert any codemod changes if needed
git checkout HEAD -- v2/**/*.ts

# 4. Verify tests pass
npm test

# 5. Document what failed for future attempt
```

---

## Files Likely Needing Changes

Based on codebase analysis:

| File | Risk Level | Reason |
|------|------------|--------|
| `v2/core/config-schema.ts` | **HIGH** | Core schema definitions using enums, unions |
| `v2/core/n8n-client.ts` | **MEDIUM** | Response parsing with Zod |
| `v2/diagnostics/types.ts` | **MEDIUM** | Type definitions with discriminated unions |
| `v2/diagnostics/failure-classifier.ts` | **LOW** | Uses Zod for validation? |
| `v2/mcp/server.ts` | **LOW** | Input schemas for MCP tools |

---

## Testing Checklist Post-Migration

- [ ] All 83+ tests pass (`npm test`)
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] Config validation works (valid/invalid configs)
- [ ] MCP tool input validation works
- [ ] Diagnostics engine runs without type errors
- [ ] dep-guard updated to accept v4 (or re-pinned to v3)

---

## Resources

- [Zod v4 Migration Guide (official)](https://zod.dev/v4-migration)
- [Zod v4 Changelog](https://github.com/colinhacks/zod/releases/tag/v4.0.0)
- [zod-codemod](https://github.com/colinhacks/zod-codemod)

---

## Decision Log

| Date | Decision | Author |
|------|----------|--------|
| 2026-10-29 | Pin to zod@3.25.76, create migration guide | James (CEO Agent) |
|  |  |  |

*Update this log when migration is attempted/completed.*