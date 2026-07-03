## v2.0.0 (2026-07-03)

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

All notable changes to Biscotto will be documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/) and the project
adheres to [Semantic Versioning](https://semver.org/).

> **Historical note:** Versions prior to v1.9.0 were documented
> post-hoc for completeness. Future releases will be appended automatically
> by `.github/workflows/release.yml` on each tag push.

---

## v2.0.0 — ESM Migration

### Breaking Changes

- Both `@biscotto/core` and `@biscotto/cli` are now ESM-only.
- CJS `require()` will throw `ERR_REQUIRE_ESM`. See [Migration Guide](./docs/migration.md).

### Added

- Duplicate command/button name detection (warns on overwrite).
- Retry logic for Discord API command deployment (3x exponential backoff).
- `CooldownManager.cleanup()` method.
- Test enforcement in CI and release workflows.

### Fixed

- Templates shipping v1.x deps → now `^2.0.0`.
- Permission typo silently passing security check (fail-closed on invalid perms).
- Windows compatibility in CLI commands (`rm -rf` → `rmSync`, SIGTERM handling).
- Wildcard `*` dependency validation inconsistency.
- Hardcoded `BUILTIN_NAMES` in discovery → derived from builtins.
- `InstalledFile` type duplication across packages.
- Fragile root path calculation in discovery.
- Hot-reload now re-imports module code from disk.
- `loadConfig` cache keyed on schema/defaults.
- Bootstrap ordering: data → storage → client → lifecycle → loadAll.

---

## v1.8.0 — Minor

- `feat`: Simplified module templates and unified manifest format.
- `fix`: Hardcoded version, broken manifest reader, and nonexistent `ctx.config` API.
- `fix`: Storage path confusion, incomplete `ModuleContext` docs, and missing boot-time service validation.
- `fix`: Dead code, wrong env var name, and hardcoded author.

---

## v1.7.2 — Patch

- `release.yml` workflow now handles both tag push and manual `workflow_dispatch`.

## v1.7.1 — Patch

- Converted Windows paths to file:// URLs for ESM dynamic import in `discovery.ts`. Exported `run()` for explicit invocation.

## v1.7.0 — Minor

- Per-module isolated storage and data directories.
- Module configuration system (typed schema + defaults).

## v1.6.0 — Minor

- Declarative intents merging on the client.

## v1.5.0 — Minor

- Middleware pipeline (cooldown + permissions).

## v1.4.0 — Minor

- Lifecycle hooks (`onLoad` / `onEnable` / `onDisable` / `onUnload`).

## v1.3.0 — Minor

- Service registry: `ctx.services.provide(...)` / `require(...)`.
- Versioned dependency resolution with cycle detection.

## v1.1.0 — Minor

- Storage system expansion (JSON, SQLite, MySQL drivers).
- Per-module storage isolation.

## v1.0.2 — Patch

- Documentation updates and minor stability fixes.
- Registered the `zero` builtin module in `Hydr46605/BiscottoRegistry` at v1.0.2.

## v1.0.1 — Patch

- Bug fixes around the install / enable flow.

## v1.0.0 — Initial Public Release

First public release of Biscotto. Modular Discord bot framework with a CLI companion package.
