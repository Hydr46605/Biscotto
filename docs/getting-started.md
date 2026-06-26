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

Export your commands, buttons, modals, and events:

```typescript
import pingCommand from './commands/ping.ts';
import confirmBtn from './components/confirm-btn.ts';
import feedbackModal from './components/feedback-form.ts';
import readyEvent from './listeners/ready.ts';

export const commands = [pingCommand];
export const buttons = [confirmBtn];
export const modals = [feedbackModal];
export const events = [readyEvent];
```

### index.ts

Bundle everything together:

```typescript
import { defineModule } from '@biscotto/core';
import { manifest } from './manifest.ts';
import { commands, buttons, modals, events } from './registry.ts';

export default defineModule({
  manifest,
  commands,
  buttons,
  modals,
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

## Buttons

Handle button interactions:

```typescript
// commands/confirm.ts
import { defineCommand } from '@biscotto/core';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default defineCommand({
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

export default defineButton({
  customId: 'confirm-yes',
  async execute(ctx) {
    await ctx.reply('Confirmed!');
  },
});

// components/confirm-no.ts
import { defineButton } from '@biscotto/core';

export default defineButton({
  customId: 'confirm-no',
  async execute(ctx) {
    await ctx.reply('Cancelled.');
  },
});
```

## Select Menus

Handle select menu interactions:

```typescript
// components/role-select.ts
import { defineSelectMenu } from '@biscotto/core';

export default defineSelectMenu({
  customId: 'role-select',
  async execute(ctx) {
    const selected = ctx.values; // selected option values
    await ctx.reply(`You selected: ${selected.join(', ')}`);
  },
});
```

## Modals

Handle modal submissions:

```typescript
// commands/feedback.ts
import { defineCommand } from '@biscotto/core';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export default defineCommand({
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

export default defineModal({
  customId: 'feedback-form',
  async execute(ctx) {
    const feedback = ctx.fields.getTextInputValue('feedback-input');
    await ctx.reply(`Thanks: ${feedback}`);
  },
});
```

## Autocomplete

Handle autocomplete interactions:

```typescript
// commands/search.ts
import { defineCommand, defineAutocomplete } from '@biscotto/core';

export default defineCommand({
  name: 'search',
  description: 'Search something',
  async execute(ctx) {
    await ctx.reply(`Searching for: ${ctx.interaction.options.getString('query')}`);
  },
});

// autocomplete/search.ts
import { defineAutocomplete } from '@biscotto/core';

export default defineAutocomplete({
  name: 'search',
  async execute(ctx) {
    const focused = ctx.options.getFocused();
    const results = ['apple', 'banana', 'cherry']
      .filter(f => f.startsWith(focused))
      .map(f => ({ name: f, value: f }));

    await ctx.respond(results);
  },
});
```

## Context Menus

Right-click user or message context menus:

```typescript
// context-menus/quick-ban.ts
import { defineUserContextMenu } from '@biscotto/core';

export default defineUserContextMenu({
  name: 'Quick Ban',
  async execute(ctx) {
    const member = ctx.interaction.guild?.members.cache.get(ctx.targetUser.id);
    if (member?.bannable) {
      await member.ban();
      await ctx.reply(`Banned ${ctx.targetUser.tag}`);
    } else {
      await ctx.reply('Cannot ban this user.', { ephemeral: true });
    }
  },
});
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `biscotto init` | Initialize a new project |
| `biscotto dev` | Start bot with hot reload |
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
