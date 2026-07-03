## What's Changed

### ⚠️ BREAKING CHANGES

`@biscotto/core` and `@biscotto/cli` are now **ESM-only**. CJS consumers using `require('@biscotto/core')` will now throw `ERR_REQUIRE_ESM`. Migrate to ESM `import` syntax:

```diff
- const { run, defineCommand } = require('@biscotto/core');
+ import { run, defineCommand } from '@biscotto/core';
```

For incremental CJS→ESM migration in existing CJS codebases, use a dynamic import inside an `async` wrapper (CJS has no top-level `await`):

```js
(async () => {
  const { run, defineCommand } = await import('@biscotto/core');
  run();
})();
```

**Why this had to be `2.0.0`**: the previous CJS emit carried a `with: { "resolution-mode": "import" }` import attribute on `@discordjs/builders` references in the generated `.d.ts`, which created a nominally distinct `SlashCommandBuilder` class identity in ESM consumers and caused `TS2322` dual-resolution hazards. Flipping to ESM eliminates the import attribute and the hazard at the type level — downstream modules no longer need `as any[]` escape hatches at the `defineModule` slot.

### 🔧 Refactor
- `packages/core`: flip to `"type": "module"` and rewrite 114 source imports from `.ts` to `.js` for `NodeNext` + ESM compliance
- `packages/core/src/index.ts`: replace CJS `if (require.main === module)` auto-launch guard with ESM-native `if (import.meta.url === pathToFileURL(process.argv[1]).href)`
- emitted `.d.ts` files now use `.js` extensions on relative imports (consumers using `NodeNext` / `Node16` / `bundler` resolution no longer need `allowImportingTsExtensions: true` to consume the types)

### 🐛 Fixes
- eliminate the `@discordjs/builders` dual-resolution-mode hazard (`TS2322`) that previously forced consumers to use `as any[]` escape hatches at the `defineModule` slot — direct consequence of the `type: "module"` flip in the **🔧 Refactor** above; see the *Why this had to be 2.0.0* note under **⚠️ BREAKING CHANGES** for the full hazard description

### 🧹 Chore
- add `"allowImportingTsExtensions": true` to the module scaffolding template (`packages/cli/templates/module/tsconfig.json`)
- update `vitest.config.ts` comment to reflect ESM core

**Full Changelog**: https://github.com/Hydr46605/Biscotto/compare/v1.9.0...v2.0.0
