# @biscotto/core

Bot framework with dynamic module loading, process management, and a plugin-based architecture ~ one biscuit at a time.

> Published as CommonJS. Designed to be paired with `@biscotto/cli` (ESM)
> in your bot project.

## Version

1.9.0

## Installation

```bash
npm install @biscotto/core
```

## Usage

```typescript
import 'dotenv/config';
import { run } from '@biscotto/core';

run();
```

`run()` bootstraps the bot: loads modules from `.biscotto/modules/`, registers commands with Discord, and connects. It only auto-fires when `@biscotto/core`'s entry file is the *program* entry point – importing the package for type-only or programmatic consumption does *not* launch the bot.

Environment variables (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`) are read from `.env` via dotenv.

## Features

- Dynamic module loading from `.biscotto/modules/`
- Dependency resolution with cycle detection
- Cross-platform process management via PID file
- Components V2 support for all Discord messages
- Guild-specific command deployment
- Modular storage (JSON, SQLite, YAML, MySQL)
- `defineCommand`, `defineButton`, `defineSelectMenu`, `defineModal`, `defineAutocomplete`, `defineUserContextMenu`, `defineMessageContextMenu`, `defineEvent`, `defineModule` helpers
- `InteractionRouter` with custom ID matching
- Declarative intents
- In-process module hot-reload driven by `.biscotto/reload.json`
