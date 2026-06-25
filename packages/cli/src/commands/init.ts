import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import { ensureBiscottoDir, writeInstalled } from '../fs.ts';

const ZERO_MODULE = `import type { BiscottoModule } from '@biscotto/core/contracts';
import { manifest } from './manifest.ts';
import { register } from './registry.ts';

export const zeroModule: BiscottoModule = {
  manifest,
  register,
};
`;

const ZERO_MANIFEST = `import type { ModuleManifest } from '@biscotto/core/contracts';

export const manifest: ModuleManifest = {
  name: 'zero',
  version: '1.0.0',
  description: 'Core module — base scaffold for Biscotto',
  entry: 'src/index.ts',
  license: 'MIT',
  tags: ['core', 'builtin'],
};
`;

const ZERO_REGISTRY = `import type { ModuleRegistration } from '../../contracts/module.contract.ts';
import { pingCommand } from './commands/ping.ts';
import { readyEvent } from './listeners/ready.ts';

export function register(): ModuleRegistration {
  return {
    commands: [pingCommand],
    events: [readyEvent],
  };
}
`;

const ZERO_PING = `import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { CommandDefinition } from '../../../contracts/module.contract.ts';

async function execute(
  interaction: ChatInputCommandInteraction,
  _client: Client,
): Promise<void> {
  await interaction.reply({
    content: 'Pong!',
    flags: MessageFlags.IsComponentsV2,
  });
}

export const pingCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot responsiveness'),
  execute,
};
`;

const ZERO_READY = `import { Events, type Client } from 'discord.js';
import type { EventDefinition } from '../../../contracts/module.contract.ts';

async function execute(client: Client): Promise<void> {
  console.log(\`Biscotto is online as \${client.user?.tag}\`);
}

export const readyEvent: EventDefinition = {
  event: Events.ClientReady,
  once: true,
  execute,
};
`;

const ENV_EXAMPLE = `DISCORD_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_GUILD_ID=your-guild-id-here

# Storage: json | sqlite | yaml | mysql
STORAGE_DRIVER=json
`;

function scaffold(ctx: { root: string }): void {
  const { root } = ctx;
  const src = resolve(root, 'src');

  // Create directories
  const dirs = [
    'modules/zero/commands',
    'modules/zero/listeners',
  ];
  for (const dir of dirs) {
    mkdirSync(resolve(root, dir), { recursive: true });
  }

  // Write files
  const files: [string, string][] = [
    ['modules/zero/index.ts', ZERO_MODULE],
    ['modules/zero/manifest.ts', ZERO_MANIFEST],
    ['modules/zero/registry.ts', ZERO_REGISTRY],
    ['modules/zero/commands/ping.ts', ZERO_PING],
    ['modules/zero/listeners/ready.ts', ZERO_READY],
    ['.env', ENV_EXAMPLE],
  ];

  for (const [path, content] of files) {
    const fullPath = resolve(root, path);
    if (!existsSync(fullPath)) {
      writeFileSync(fullPath, content, 'utf-8');
    }
  }

  ensureBiscottoDir(root);
  writeInstalled(root, { version: 1, modules: {} });
}

export const initCommand: Command = {
  name: 'init',
  description: 'Initialize a new Biscotto project',
  usage: 'biscotto init [directory]',
  async run(ctx) {
    const target = ctx.args[0]
      ? resolve(ctx.root, ctx.args[0])
      : ctx.root;

    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }

    scaffold({ root: target });

    console.log(`  Initialized Biscotto project in ${target}`);
    console.log(`  Next steps:`);
    console.log(`    1. Edit .env with your bot token`);
    console.log(`    2. npm install`);
    console.log(`    3. biscotto start`);
  },
};
