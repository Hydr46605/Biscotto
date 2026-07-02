import { mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { Command } from '../command.ts';
import {
  copyTemplate,
  getTemplatesDir,
  hasTemplates,
} from '../template.ts';

function gitConfig(key: string): string | undefined {
  try {
    return execSync(`git config user.${key}`, { encoding: 'utf-8' }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Stack → feature-token map. Drives both the feature-gated template
 * filename prefix (`+buttons.ts` etc.) and the `{{#if FEATURE}}` blocks
 * inside scaffolded source files. Documented in
 * `docs/getting-started.md` and `packages/cli/README.md`.
 */
const STACK_FEATURES: Record<string, string[]> = {
  simple:   ['commands'],
  full:     ['commands', 'buttons', 'modals', 'selects'],
  voice:    ['commands', 'voice'],
  storage:  ['commands', 'storage'],
  moderate: ['commands', 'buttons'],
};

const KNOWN_STACKS = Object.keys(STACK_FEATURES);

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new Biscotto module',
  usage: `biscotto create <name> [--stack <${KNOWN_STACKS.join('|')}>]`,
  async run(ctx) {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      console.log('  Usage: biscotto create <name> [--stack <name>]');
      console.log('');
      console.log(`  Stacks: ${KNOWN_STACKS.join(', ')}`);
      console.log('    simple   - Commands only');
      console.log('    full     - Commands + buttons + modals + selects');
      console.log('    voice    - Commands + voice support');
      console.log('    storage  - Commands + storage integration');
      console.log('    moderate - Commands + buttons (moderation style)');
      return;
    }

    // Validate module name against the same regex used in core validation.
    if (!/^[a-z][a-z0-9-]*$/.test(moduleName)) {
      console.log(`  Error: invalid module name "${moduleName}". Use lowercase alphanumeric with hyphens (e.g. "my-module").`);
      process.exit(1);
    }

    const templatesDir = getTemplatesDir();
    if (!hasTemplates()) {
      console.log('  Templates directory not found');
      return;
    }

    const moduleDir = resolve(ctx.root, 'modules', moduleName);
    if (existsSync(moduleDir)) {
      console.log(`  Module ${moduleName} already exists`);
      return;
    }

    // Resolve --stack flag (ctx.flags contains single-char aliases too;
    // we only care about --stack).
    let stack = ctx.options['stack'] ?? 'simple';
    if (!KNOWN_STACKS.includes(stack)) {
      console.log(`  Error: unknown stack "${stack}". Use one of: ${KNOWN_STACKS.join(', ')}.`);
      process.exit(1);
    }
    const features = STACK_FEATURES[stack]!;

    const author = gitConfig('name') ?? 'Author';
    const authorUrl = gitConfig('url') ?? 'https://github.com/yourname';

    console.log(`  Creating module: ${moduleName}`);
    console.log(`  Stack: ${stack} (${features.join(', ')})`);
    mkdirSync(moduleDir, { recursive: true });

    copyTemplate(resolve(templatesDir, 'module'), moduleDir, {
      vars: {
        MODULE_NAME: moduleName,
        DESCRIPTION: `A Biscotto module (stack: ${stack})`,
        AUTHOR: author,
        AUTHOR_URL: authorUrl,
      },
      features,
    });

    console.log('');
    console.log(`  Module created at modules/${moduleName}/`);
    console.log('');
    console.log('  Next steps:');
    console.log(`    cd modules/${moduleName}`);
    console.log('    npm install');
    console.log('    npm run build');
  },
};
