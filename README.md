<p align="center">
  <img src="assets/cookie.png" width="128" alt="Biscotto">
</p>

<h1 align="center">Biscotto</h1>

<p align="center">
  <em>Freshly baked for your server.</em>
</p>

<p align="center">
  <a href="https://github.com/Hydr46605/Biscotto/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
  <a href="https://github.com/Hydr46605/Biscotto"><img src="https://img.shields.io/badge/version-1.0.0-brightgreen" alt="Version"></a>
</p>

---

A modular Discord bot framework with package management. Install modules from GitHub, manage processes, and build your dream bot ~ one biscuit at a time.

## Quick Start

```bash
npm install -g @biscotto/cli
biscotto init my-bot
cd my-bot
npm install
# edit .env with your bot token
biscotto start
```

## Documentation

- **[Getting Started](docs/getting-started.md)** ~ setup, first module, commands, events, storage
- **[Core API](packages/core/README.md)** ~ framework internals

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@biscotto/core`](https://www.npmjs.com/package/@biscotto/core) | Bot framework with dynamic module loading | `npm i @biscotto/core` |
| [`@biscotto/cli`](https://www.npmjs.com/package/@biscotto/cli) | CLI for managing modules and processes | `npm i -g @biscotto/cli` |

## Module System

```bash
# Install a module
biscotto add Hydr46605/BiscottoTicket

# List installed
biscotto list

# Start the bot
biscotto start
```

## Creating a Module

```typescript
import { defineCommand, defineModule } from '@biscotto/core';

const ping = defineCommand({
  name: 'ping',
  description: 'Check bot responsiveness',
  async execute(ctx) {
    await ctx.reply('Pong!');
  },
});

export default defineModule({
  manifest: { name: 'my-module', version: '1.0.0' },
  commands: [ping],
});
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `biscotto init` | Initialize a new project |
| `biscotto add <source>` | Install a module |
| `biscotto remove <name>` | Uninstall a module |
| `biscotto list` | List installed modules |
| `biscotto start` | Start bot in background |
| `biscotto stop` | Stop the bot |
| `biscotto restart` | Restart the bot |
| `biscotto status` | Show bot status |
| `biscotto update <name>` | Update a module |
| `biscotto search <query>` | Search registry |

## License

[MIT](LICENSE)
