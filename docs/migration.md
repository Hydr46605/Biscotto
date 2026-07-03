# Migrating from v1.x to v2.0.0

Biscotto v2.0.0 is **ESM-only**. Using `require('@biscotto/core')` will throw `ERR_REQUIRE_ESM`.

---

## TL;DR

```diff
- const { run, defineCommand } = require('@biscotto/core');
+ import { run, defineCommand } from '@biscotto/core';
```

---

## What Changed

| Area | Before (v1.x) | After (v2.0.0) |
| --- | --- | --- |
| `@biscotto/core` module system | CJS | ESM |
| `@biscotto/cli` module system | ESM | ESM (unchanged) |
| Emitted `.d.ts` relative imports | `.ts` | `.js` |
| Public API | unchanged | unchanged |
| Module manifest (`biscotto.json`) | unchanged | unchanged |
| Service registry | unchanged | unchanged |
| Storage API | unchanged | unchanged |

---

## How to Migrate

### 1. Update dependencies

```json
"dependencies": {
  "@biscotto/core": "^2.0.0"
}
```

### 2. Switch from `require` to `import`

```diff
- const { run, defineModule } = require('@biscotto/core');
+ import { run, defineModule } from '@biscotto/core';
```

### 3. Ensure your project is ESM

In `package.json`:
```json
"type": "module"
```

In `tsconfig.json`:
```json
"module": "NodeNext",
"moduleResolution": "NodeNext"
```

### 4. Add `.js` extensions to relative imports

```diff
- import myModule from './my-module';
+ import myModule from './my-module.js';
```

### 5. Clean up tsconfig (optional)

You can remove `allowImportingTsExtensions: true` from your `tsconfig.json` — v2.0.0 emits `.js` extensions in `.d.ts` files, which is the standard Node ESM convention.

---

## Incremental Migration from CJS

If you can't convert the whole project at once, use a dynamic import inside an async wrapper:

```js
(async () => {
  const { run, defineModule } = await import('@biscotto/core');
  const myModule = (await import('./my-module.cjs')).default;
  run();
})();
```

This lets you keep `"type": "commonjs"` in `package.json` and migrate file-by-file.

---

## Troubleshooting

| Error | Fix |
| --- | --- |
| `ERR_REQUIRE_ESM` on `require()` | Migrate to `import` or use the async-IIFE pattern above |
| `ERR_MODULE_NOT_FOUND` on relative import | Add `.js` extension to the import path |
| `SyntaxError: Cannot use import statement outside a module` | Set `"type": "module"` in `package.json` |
| `TS2322` type errors at `defineModule` | Run `npm ls @discordjs/builders` and update to match Biscotto's version |
| Still seeing `ERR_REQUIRE_ESM` after migration | Run `npm ls @biscotto/core` — you may still resolve `^1.x` |

---

*Freshly baked for your server ~ one biscuit at a time.*
