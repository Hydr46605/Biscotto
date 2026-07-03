# Getting Started

> **Upgrading from v1.x?** Read the [Migration Guide](./migration.md) first.

## Prerequisites

- Node.js 22+
- npm

## Quick Start

```bash
npm install -g @biscotto/cli
biscotto init my-bot
cd my-bot
npm install
```

Edit `.env` with your bot token:

```env
DISCORD_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
```

Then start the bot:

```bash
biscotto dev
```

## Project Structure

```
my-bot/
  .biscotto/
    installed.json      # installed modules registry
  src/
    index.ts            # bot entry point
  modules/
    zero/               # your first module
      manifest.ts       # module metadata
      index.ts          # module entry point
      commands/
        ping.ts         # slash command
      listeners/
        ready.ts        # event listener
  .env                  # environment variables
  package.json
  tsconfig.json
```

## Creating a Module

### Scaffolding

```bash
biscotto create my-module              # commands only (default)
biscotto create my-module --stack full # full stack

# Available stacks:
#   simple   — commands only
#   full     — commands + buttons + modals + selects
#   voice    — commands + voice support
#   storage  — commands + storage integration
#   moderate — commands + buttons (moderation style)
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
import { defineEvent } from '@biscotto/core';

export const onReady = defineEvent({
  name: 'ready',
  once: true,
  async execute(client) {
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

Each module gets its own isolated storage. Declare the driver in your manifest:

```typescript
import { defineModule } from '@biscotto/core';

export default defineModule({
  manifest: {
    name: 'my-module',
    version: '1.0.0',
    storage: { driver: 'sqlite' },  // 'json' | 'sqlite' | 'yaml' | 'mysql'
  },
  async onLoad(ctx) {
    await ctx.storage.set('counter', 42);
    const count = await ctx.storage.get<number>('counter');
    const exists = await ctx.storage.has('counter');
    await ctx.storage.delete('counter');
    const all = await ctx.storage.all();
  },
});
```

Each module also gets a data directory for free files (images, cards, etc.) via `ctx.data`:

```typescript
onLoad(ctx) {
  ctx.data.writeFile('logo.png', imageBuffer);
  const image = ctx.data.readBuffer('logo.png');
  const files = ctx.data.listFiles();
}
```

See [Module Storage](./module-storage.md) for details.

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
  onLoad(ctx) {
    const cfg = ctx.data.loadConfig(config.schema, config.defaults);
    ctx.logger.info(`Greeting: ${cfg.greeting}`);

    // Get/set individual values
    const rate = ctx.data.getConfig<number>('maxWarnings');
    ctx.data.setConfig('maxWarnings', 5);
  },
});
```

Configs are stored in `.biscotto/configs/<ModuleName>/config.json` and auto-created on first load.

See [Module Config](./module-config.md) for details.

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

## Components V2

For complex UIs (containers, sections, separators):

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

## Buttons

```typescript
// commands/confirm.ts
import { defineCommand } from '@biscotto/core';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const confirmCommand = defineCommand({
  name: 'confirm',
  description: 'Show a confirmation button',
  async execute(ctx) {
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
  async execute(ctx) {
    await ctx.reply('Confirmed!');
  },
});

// components/confirm-no.ts
import { defineButton } from '@biscotto/core';

export const confirmNoButton = defineButton({
  customId: 'confirm-no',
  async execute(ctx) {
    await ctx.reply('Cancelled.');
  },
});
```

## Select Menus

```typescript
import { defineSelectMenu } from '@biscotto/core';

export const roleSelect = defineSelectMenu({
  customId: 'role-select',
  type: 'string',
  options: [
    { label: 'Admin', value: 'admin' },
    { label: 'Mod', value: 'mod' },
    { label: 'User', value: 'user' },
  ],
  async execute(ctx) {
    await ctx.reply(`You selected: ${ctx.values.join(', ')}`);
  },
});
```

## Modals

```typescript
// commands/feedback.ts
import { defineCommand } from '@biscotto/core';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export const feedbackCommand = defineCommand({
  name: 'feedback',
  description: 'Send feedback',
  async execute(ctx) {
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
  async execute(ctx) {
    const feedback = ctx.fields.get('Feedback');
    await ctx.reply(`Thanks: ${feedback}`);
  },
});
```

## Context Menus

Right-click user or message context menus:

```typescript
import { defineUserContextMenu } from '@biscotto/core';

export const quickBan = defineUserContextMenu({
  name: 'Quick Ban',
  async execute(ctx) {
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

```bash
biscotto pack my-module           # validate
biscotto publish my-module        # publish to GitHub
biscotto publish my-module --private   # private repo
biscotto publish my-module --dry-run   # validation only
biscotto publish my-module --registry  # include registry instructions
```

## CLI Reference

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
