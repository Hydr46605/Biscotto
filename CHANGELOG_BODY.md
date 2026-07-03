## What's Changed

### ✨ Features
- feat(cooldown): add cleanup() method to CooldownManager (0f35388)
- feat: stack-based module scaffolding, in-process hot reload, broader manifest validation (6e5529c)
- feat: simplify module templates and unify manifest format (9d1623a)

### 🐛 Bug Fixes
- fix(publish): remove hardcoded GitHub username (aa89a49)
- fix(core): reorder bootstrap — data, storage, client before lifecycle hooks (09aba65)
- fix(data): key loadConfig cache on schema and defaults (1719aaa)
- fix(registrar): add retry logic for Discord API command deployment (4a3062f)
- fix(router): warn on duplicate command and button names (0cc533d)
- fix(hotreload): re-import module code from disk with cache-busting (7d2a705)
- fix(discovery): derive builtin names from actual builtins, consolidate InstalledFile type, fix root path (17113c4)
- fix(cli): Windows compatibility — rmSync, SIGTERM, and message fixes (2440273)
- fix(security): fail-closed on invalid permission declarations (bf2835f)
- fix(templates): update peer deps to ^2.0.0 and fix tsconfig build error (3acb2d7)
- fix: critical bugs from prior audit (d90ca9a)
- fix: dead code, wrong env var name, and hardcoded author (9607656)
- fix: storage path confusion, incomplete ModuleContext docs, and missing boot-time service validation (8a02d64)
- fix: hardcoded version, broken manifest reader, and nonexistent ctx.config API (8c9e23f)
- fix: convert Windows paths to file:// URLs for ESM dynamic import (2120632)
- fix: release workflow now handles both tag push and manual dispatch (6660c8e)
- fix: exported run(), fixed templates/docs to use execute(), fixed DEP0190 shell warning (49d5e89)

### 📦 Other Changes
- release: v2.0.0 (fc88ebd)
- docs: rewrite documentation for clarity and consistency (b850bed)
- chore(ci): add test enforcement to CI and release workflows (302bb25)
- refactor(core): migrate to ESM-only module system (fdd5972)
- chore: bump version to 2.0.0 (3082652)
- chore: docs, CHANGELOG bootstrap, and version bump to 1.9.0 (6b650c1)
- refactor: drop dead code and align exported types (5348df4)
- test: add vitest infrastructure and initial test suite (dad3a0a)
- release: v1.8.0 (572094d)
- 1.7.2 (b87a303)
- 1.7.1 (2e772ec)

**Full Changelog**: https://github.com/Hydr46605/Biscotto/compare/v1.7.0...v2.0.0
