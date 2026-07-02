# Changelog

All notable changes to Biscotto will be documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/) and the project
adheres to [Semantic Versioning](https://semver.org/).

> **Historical note:** Versions prior to v1.9.0 were documented
> post-hoc for completeness. Future releases will be appended automatically
> by `.github/workflows/release.yml` on each tag push.

---

## v1.0.0 — Initial Public Release

First public release of Biscotto. Modular Discord bot framework with a CLI
companion package.

## v1.0.1 — Patch

- Bug fixes around the install / enable flow.

## v1.0.2 — Patch

- Documentation updates and minor stability fixes.
- Registered the `zero` builtin module in `Hydr46605/BiscottoRegistry` at
  v1.0.2.

## v1.1.0 — Minor

- Storage system expansion (JSON, SQLite, MySQL drivers).
- Per-module storage isolation.

## v1.3.0 — Minor

- Service registry: `ctx.services.provide(...)` / `require(...)`.
- Versioned dependency resolution with cycle detection.

## v1.4.0 — Minor

- Lifecycle hooks (`onLoad` / `onEnable` / `onDisable` / `onUnload`).

## v1.5.0 — Minor

- Middleware pipeline (cooldown + permissions).

## v1.6.0 — Minor

- Declarative intents merging on the client.

## v1.7.0 — Minor

- Per-module isolated storage and data directories.
- Module configuration system (typed schema + defaults).

## v1.7.1 — Patch

- Converted Windows paths to file:// URLs for ESM dynamic import in
  `discovery.ts`. Exported `run()` for explicit invocation.

## v1.7.2 — Patch

- `release.yml` workflow now handles both tag push and manual `workflow_dispatch`.

## v1.8.0 — Minor

- `feat`: Simplified module templates and unified manifest format.
- `fix`: Hardcoded version, broken manifest reader, and nonexistent
  `ctx.config` API.
- `fix`: Storage path confusion, incomplete `ModuleContext` docs, and
  missing boot-time service validation.
- `fix`: Dead code, wrong env var name, and hardcoded author.

---
