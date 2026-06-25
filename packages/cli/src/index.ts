#!/usr/bin/env node

import { commands } from './commands/index.ts';
import type { CommandContext } from './command.ts';
import { findRoot } from './fs.ts';

// ── Help ──────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
  Bi\x1b[33mscotto\x1b[0m CLI

  Usage: biscotto <command> [options]

  Commands:
${commands.map((c) => `    ${c.name.padEnd(12)} ${c.description}`).join('\n')}

  Run 'biscotto <command> --help' for more information on a command.
`);
}

// ── Router ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [, , commandName, ...rest] = process.argv;
  const root = findRoot();

  if (!commandName || commandName === '--help' || commandName === '-h') {
    printHelp();
    return;
  }

  if (commandName === '--version' || commandName === '-v') {
    console.log('biscotto v1.0.0');
    return;
  }

  const command = commands.find((c) => c.name === commandName);
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.error(`Run 'biscotto --help' for available commands.`);
    process.exit(1);
  }

  if (rest.includes('--help') || rest.includes('-h')) {
    console.log(`\n  biscotto ${command.name}`);
    console.log(`  ${command.description}`);
    if (command.usage) console.log(`\n  Usage: ${command.usage}`);
    console.log('');
    return;
  }

  const ctx: CommandContext = { args: rest, root };

  try {
    await command.run(ctx);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
