<p align="center">
  <img src="assets/cookie.png" width="128" alt="Biscotto">
</p>

<h1 align="center">Biscotto</h1>

<p align="center">
  <em>Freshly baked for your server.</em>
</p>

<p align="center">
  <a href="https://github.com/Hydr46605/Biscotto/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
  <a href="https://github.com/Hydr46605/Biscotto"><img src="https://img.shields.io/badge/version-2.0.0-brightgreen" alt="Version"></a>
</p>

---

A modular Discord bot framework with package management. Install modules from GitHub, manage processes, and build your dream bot ~ one biscuit at a time.

> **Heads up:** v2.0.0 is ESM-only. If you're upgrading from v1.x, check the [Migration Guide](./docs/migration.md).

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

- **[Getting Started](docs/getting-started.md)** ~ setup, first module, commands, events
- **[Module Storage](docs/module-storage.md)** ~ per-module isolated storage and data
- **[Module Config](docs/module-config.md)** ~ typed configuration with schema
- **[Module Ecosystem](docs/module-ecosystem.md)** ~ dependencies, services, lifecycle
- **[Core API](packages/core/README.md)** ~ framework internals

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@biscotto/core`](https://www.npmjs.com/package/@biscotto/core) | Bot framework with dynamic module loading | `npm i @biscotto/core` |
| [`@biscotto/cli`](https://www.npmjs.com/package/@biscotto/cli) | CLI for managing modules and processes | `npm i -g @biscotto/cli` |

## Module System

```bash
biscotto add Hydr46605/Biscotto   # install a module
biscotto list                      # list installed
biscotto start                     # start the bot
```

## Creating a Module

```bash
biscotto create my-module              # commands only (default)
biscotto create my-module --stack full # full stack (buttons, modals, selects)
```

```typescript
import { defineCommand, defineButton, defineModule } from '@biscotto/core';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const greet = defineCommand({
  name: 'greet',
  description: 'Say hello with a button',
  async execute(ctx) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('greet-btn')
        .setLabel('Say Hello')
        .setStyle(ButtonStyle.Primary),
    );
    await ctx.interaction.reply({ components: [row] });
  },
});

const greetBtn = defineButton({
  customId: 'greet-btn',
  async execute(ctx) {
    await ctx.reply(`Hello ${ctx.interaction.user.tag}!`);
  },
});

export default defineModule({
  manifest: { name: 'my-module', version: '1.0.0' },
  commands: [greet],
  buttons: [greetBtn],
});
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `biscotto init` | Initialize a new project |
| `biscotto create <name> [--stack]` | Create a new module |
| `biscotto add <source>` | Install a module from GitHub |
| `biscotto remove <name>` | Uninstall a module |
| `biscotto list` | List installed modules |
| `biscotto dev` | Start bot with hot reload |
| `biscotto start` | Start bot in background |
| `biscotto stop` | Stop the bot |
| `biscotto restart` | Restart the bot |
| `biscotto status` | Show bot status |
| `biscotto enable <name>` | Enable a module |
| `biscotto disable <name>` | Disable a module |
| `biscotto reload <name>` | Hot-reload a running module |
| `biscotto config <module>` | View/edit module config |
| `biscotto update <name>` | Update a module |
| `biscotto search <query>` | Search registry |

## License

[MIT](LICENSE)
