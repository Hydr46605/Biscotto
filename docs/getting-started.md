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
# DISCORD_TOKEN=your_token_here
# DISCORD_CLIENT_ID=your_client_id
# DISCORD_GUILD_ID=your_guild_id

# Start the bot
biscotto dev
```

## Project Structure

```
my-bot/
  .biscotto/
    installed.json      # Installed modules registry
  src/
    index.ts            # Bot entry point
  modules/
    zero/               # Your first module
      manifest.ts       # Module metadata
      index.ts          # Module entry point
      commands/
        ping.ts         # Slash command
      listeners/
        ready.ts        # Event listener
  .env                  # Environment variables
  package.json
  tsconfig.json
```

## Creating a Module

### Using the CLI

```bash
# Create a module with commands only
biscotto create my-module

# Create a module with all features
biscotto create my-module --stack full

# Available stacks:
#   simple   - Commands only
#   full     - Commands + buttons + modals + selects
#   voice    - Commands + voice support
#   storage  - Commands + storage integration
#   moderate - Commands + buttons (moderation style)
```

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
  license: 'MIT',
  tags: ['utility'],
};
```

### commands/ping.ts

Create a slash command:

```typescript
import { defineCommand } from '@biscotto/core';

export const pingCommand = defineCommand({
  name: 'ping',
  description: 'Check bot responsiveness',
  async run(ctx) {
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
import { defineEvent } from '@biscotto/core';

export const onReady = defineEvent({
  name: 'ready',
  once: true,
  run(client) {
    console.log(`Online as ${client.user?.tag}`);
  },
});
```

### index.ts

Bundle everything together:

```typescript
import { defineModule } from '@biscotto/core';
import { manifest } from './manifest.js';
import { pingCommand } from './commands/ping.js';
import { onReady } from './listeners/ready.js';

export default defineModule({
  manifest,
  commands: [pingCommand],
  events: [onReady],
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

## Module Configuration

Each module can define a typed config schema with automatic defaults, merging, and validation:

```typescript
import { defineModule, defineConfig } from '@biscotto/core';

const config = defineConfig({
  schema: {
    greeting: { type: 'string', description: 'Greeting message', default: 'Hello!' },
    maxWarnings: { type: 'number', description: 'Max warnings before mute', default: 3 },
    logActions: { type: 'boolean', description: 'Log moderation actions', default: true },
  },
  defaults: { greeting: 'Hello!', maxWarnings: 3, logActions: true },
});

export default defineModule({
  manifest,
  config,
  onLoad(ctx) {
    const greeting = ctx.config.get<string>(manifest.name, 'greeting');
    ctx.logger.info(`Greeting: ${greeting}`);
  },
});
```

Configs are stored in `.biscotto/configs/<module>.json` and auto-created on first load.

See [Module Configuration](./module-config.md) for details.

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

export const infoCommand = defineCommand({
  name: 'info',
  description: 'Show server info',
  async run(ctx) {
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

## Buttons

Handle button interactions:

```typescript
// commands/confirm.ts
import { defineCommand } from '@biscotto/core';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const confirmCommand = defineCommand({
  name: 'confirm',
  description: 'Show a confirmation button',
  async run(ctx) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm-yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('confirm-no')
        .setLabel('No')
        .setStyle(ButtonStyle.Secondary),
    );

    await ctx.interaction.reply({ components: [row] });
  },
});

// components/confirm-yes.ts
import { defineButton } from '@biscotto/core';

export const confirmYesButton = defineButton({
  customId: 'confirm-yes',
  run(ctx) {
    ctx.reply('Confirmed!');
  },
});

// components/confirm-no.ts
import { defineButton } from '@biscotto/core';

export const confirmNoButton = defineButton({
  customId: 'confirm-no',
  run(ctx) {
    ctx.reply('Cancelled.');
  },
});
```

## Select Menus

Handle select menu interactions:

```typescript
// components/role-select.ts
import { defineSelectMenu } from '@biscotto/core';

export const roleSelect = defineSelectMenu({
  customId: 'role-select',
  type: 'string',
  options: [
    { label: 'Admin', value: 'admin' },
    { label: 'Mod', value: 'mod' },
    { label: 'User', value: 'user' },
  ],
  run(ctx) {
    ctx.reply(`You selected: ${ctx.values.join(', ')}`);
  },
});
```

## Modals

Handle modal submissions:

```typescript
// commands/feedback.ts
import { defineCommand } from '@biscotto/core';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export const feedbackCommand = defineCommand({
  name: 'feedback',
  description: 'Send feedback',
  async run(ctx) {
    const modal = new ModalBuilder()
      .setCustomId('feedback-form')
      .setTitle('Feedback')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('feedback-input')
            .setLabel('Your feedback')
            .setStyle(TextInputStyle.Paragraph),
        ),
      );

    await ctx.interaction.showModal(modal);
  },
});

// components/feedback-form.ts
import { defineModal } from '@biscotto/core';

export const feedbackModal = defineModal({
  customId: 'feedback-form',
  fields: [
    { type: 'paragraph', label: 'Feedback', required: true },
  ],
  run(ctx) {
    const feedback = ctx.fields.get('Feedback');
    ctx.reply(`Thanks: ${feedback}`);
  },
});
```

## Context Menus

Right-click user or message context menus:

```typescript
// context-menus/quick-ban.ts
import { defineUserContextMenu } from '@biscotto/core';

export const quickBan = defineUserContextMenu({
  name: 'Quick Ban',
  async run(ctx) {
    const member = ctx.interaction.guild?.members.cache.get(ctx.targetUser.id);
    if (member?.bannable) {
      await member.ban();
      ctx.reply(`Banned ${ctx.targetUser.tag}`);
    } else {
      ctx.reply('Cannot ban this user.', { ephemeral: true });
    }
  },
});
```

## Publishing Your Module

### Validate

```bash
# Check if your module is ready
biscotto pack my-module
```

### Publish

```bash
# Publish to GitHub
biscotto publish my-module

# Publish with private repo
biscotto publish my-module --private

# Dry run (validation only)
biscotto publish my-module --dry-run

# Include registry submission instructions
biscotto publish my-module --registry
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `biscotto init <name>` | Initialize a new project |
| `biscotto create <name>` | Create a new module |
| `biscotto pack <module>` | Validate a module |
| `biscotto publish <module>` | Publish a module |
| `biscotto dev` | Start bot with hot reload |
| `biscotto add <source>` | Install a module from GitHub |
| `biscotto remove <name>` | Uninstall a module |
| `biscotto list` | List installed modules |
| `biscotto start` | Start bot in background |
| `biscotto stop` | Stop the bot |
| `biscotto restart` | Restart the bot |
| `biscotto status` | Show bot status |
| `biscotto enable <name>` | Enable a module |
| `biscotto disable <name>` | Disable a module |
| `biscotto reload <name>` | Reload a module |
| `biscotto config <module>` | View/edit module config |
| `biscotto update <name>` | Update a module |
| `biscotto search <query>` | Search registry |

## What's Next?

- Browse modules in the [Registry](https://github.com/Hydr46605/BiscottoRegistry)
- Check the [Core API](../packages/core/README.md) for details
- Join the community and share your modules

---

*Freshly baked for your server ~ one biscuit at a time.*
