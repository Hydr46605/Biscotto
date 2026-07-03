# @biscotto/core

Bot framework with dynamic module loading, process management, and a plugin-based architecture ~ one biscuit at a time.

> Published as ESM. Pair with `@biscotto/cli` in your bot project.

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

`run()` bootstraps the bot: loads modules from `.biscotto/modules/`, registers commands with Discord, and connects. It only auto-fires when this package's entry file is the *program* entry point — importing for types or programmatic use does *not* launch the bot.

Environment variables (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`) are read from `.env` via dotenv.

## Features

- **Dynamic module loading** from `.biscotto/modules/`
- **Dependency resolution** with cycle detection
- **Process management** via PID file (cross-platform)
- **Components V2** support for all Discord messages
- **Guild-specific** command deployment
- **Modular storage** — JSON, SQLite, YAML, MySQL
- **Define helpers** — `defineCommand`, `defineButton`, `defineSelectMenu`, `defineModal`, `defineAutocomplete`, `defineUserContextMenu`, `defineMessageContextMenu`, `defineEvent`, `defineModule`
- **Interaction routing** with custom ID matching
- **Declarative intents** merged from all modules
- **Hot-reload** driven by `.biscotto/reload.json`
