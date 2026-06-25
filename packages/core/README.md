# @biscotto/core

Bot framework with dynamic module loading, process management, and a plugin-based architecture ~ one biscuit at a time.

## Installation

```bash
npm install @biscotto/core
```

## Usage

```typescript
import { run } from '@biscotto/core/bot';

const env = {
  BOT_TOKEN: process.env.BOT_TOKEN!,
  BOT_CLIENT_ID: process.env.BOT_CLIENT_ID!,
  BOT_GUILD_ID: process.env.BOT_GUILD_ID!,
  STORAGE_PATH: process.env.STORAGE_PATH ?? 'data/storage.json',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'DEBUG',
};

run(env);
```

## Features

- Dynamic module loading from `.biscotto/modules/`
- Dependency resolution with cycle detection
- Cross-platform process management via PID file
- Components V2 support for all Discord messages
- Guild-specific command deployment
- Modular storage (JSON, SQLite, YAML, MySQL)

## Module Contract

```typescript
import type { BiscottoModule } from '@biscotto/core/contracts';

export default {
  manifest: {
    name: 'my-module',
    version: '1.0.0',
    author: 'Your Name',
    entry: 'registry',
    build: { type: 'typescript', outdir: 'dist' },
    engine: { discord.js: '^14.0.0' },
    dependencies: {},
  },
  register() {
    return { commands: [], events: [] };
  },
} satisfies BiscottoModule;
```

## Author

**Hydr46605** — [github.com/Hydr46605](https://github.com/Hydr46605)
