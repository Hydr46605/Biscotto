# Getting Started with Biscotto

Freshly baked for your server ~ one biscuit at a time.

---

## Prerequisites

- Node.js 22+
- npm

## Quick Start

```bash
# Install the CLI globally
npm install -g @biscotto/cli

# Initialize a new project
biscotto init my-bot

# Navigate to your project
cd my-bot

# Install dependencies
npm install

# Edit .env with your bot token
# BOT_TOKEN=your_token_here
# BOT_CLIENT_ID=your_client_id
# BOT_GUILD_ID=your_guild_id

# Start the bot
biscotto start
```

## Project Structure

```
my-bot/
  .biscotto/
    installed.json      # Installed modules registry
  modules/
    zero/               # Your first module
      manifest.ts       # Module metadata
      registry.ts       # Commands and events
      index.ts          # Module entry point
      commands/
        ping.ts         # Slash command
      listeners/
        ready.ts        # Event listener
  .env                  # Environment variables
  package.json
```

## Creating a Module

### manifest.ts

Define your module's metadata:

```typescript
import type { ModuleManifest } from '@biscotto/core';

export const manifest: ModuleManifest = {
  name: 'my-module',
  version: '1.0.0',
  description: 'My awesome module',
  author: {
    name: 'YourName',
    url: 'https://github.com/yourname',
  },
  entry: 'src/index.ts',
  license: 'MIT',
  tags: ['utility'],
};
```

### commands/ping.ts

Create a slash command:

```typescript
import { defineCommand } from '@biscotto/core';

export default defineCommand({
  name: 'ping',
  description: 'Check bot responsiveness',
  async execute(ctx) {
    await ctx.reply('Pong!');
  },
});
```

The `ctx` (CommandContext) provides:

| Property | Description |
|----------|-------------|
| `ctx.interaction` | Raw Discord.js interaction |
| `ctx.client` | Raw Discord.js client |
| `ctx.reply(content, options?)` | Reply with Components V2 |
| `ctx.defer(options?)` | Defer the reply |

### listeners/ready.ts

Listen to Discord events:

```typescript
import { Events } from 'discord.js';
import { defineEvent } from '@biscotto/core';

export default defineEvent({
  event: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Online as ${(client as any).user?.tag}`);
  },
});
```

### registry.ts

Export your commands and events:

```typescript
import pingCommand from './commands/ping.ts';
import readyEvent from './listeners/ready.ts';

export const commands = [pingCommand];
export const events = [readyEvent];
```

### index.ts

Bundle everything together:

```typescript
import { defineModule } from '@biscotto/core';
import { manifest } from './manifest.ts';
import { commands, events } from './registry.ts';

export default defineModule({
  manifest,
  commands,
  events,
});
```

## Declarative Intents

If your module needs specific gateway intents, declare them:

```typescript
import { GatewayIntentBits } from 'discord.js';
import { defineModule } from '@biscotto/core';

export default defineModule({
  manifest,
  intents: [GatewayIntentBits.GuildMembers],
  commands,
  events,
});
```

Biscotto merges intents from all modules automatically. Base intents (`Guilds`, `GuildMessages`, `GuildVoiceStates`, `DirectMessages`) are always included.

## Storage

Each module gets a namespaced storage instance:

```typescript
import { defineModule } from '@biscotto/core';
import { storage } from '@biscotto/core';

export default defineModule({
  manifest,
  async onInit(client) {
    const db = storage.namespace('my-module');

    // Set a value
    await db.set('counter', 42);

    // Get a value
    const count = await db.get<number>('counter');

    // Check if key exists
    const exists = await db.has('counter');

    // Delete a key
    await db.delete('counter');

    // Get all keys
    const all = await db.all();
  },
});
```

Supported drivers: `json`, `sqlite`, `yaml`, `mysql` (configure in `.env`).

## Ephemeral Replies

Reply only visible to the user:

```typescript
await ctx.reply('Secret message!', { ephemeral: true });
```

## Deferring Replies

For commands that take time:

```typescript
await ctx.defer({ ephemeral: false });
// ... do heavy work ...
await ctx.interaction.editReply('Done!');
```

## Advanced: Raw Interaction Access

For complex UIs (Containers, Sections, etc.):

```typescript
import { defineCommand } from '@biscotto/core';
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from 'discord.js';

export default defineCommand({
  name: 'info',
  description: 'Show server info',
  async execute(ctx) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Server Info'),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Members: ${ctx.interaction.guild?.memberCount}`),
      );

    await ctx.interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `biscotto init` | Initialize a new project |
| `biscotto add <source>` | Install a module from GitHub |
| `biscotto remove <name>` | Uninstall a module |
| `biscotto list` | List installed modules |
| `biscotto start` | Start bot in background |
| `biscotto stop` | Stop the bot |
| `biscotto restart` | Restart the bot |
| `biscotto status` | Show bot status |
| `biscotto update <name>` | Update a module |
| `biscotto search <query>` | Search registry |

## What's Next?

- Browse modules in the [Registry](https://github.com/Hydr46605/BiscottoRegistry)
- Check the [Core API](../packages/core/README.md) for details
- Join the community and share your modules

---

*Freshly baked for your server ~ one biscuit at a time.*
