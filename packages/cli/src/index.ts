#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { commands } from './commands/index.ts';
import type { CommandContext } from './command.ts';
import { findRoot } from './fs.ts';

const VERSION: string = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', 'package.json'), 'utf-8'),
).version;

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

// ── Arg Parsing ───────────────────────────────────────────────────────────────

function parseArgs(rest: string[]): { args: string[]; flags: string[]; options: Record<string, string> } {
  const args: string[] = [];
  const flags: string[] = [];
  const options: Record<string, string> = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        flags.push(key);
      }
    } else if (arg.startsWith('-')) {
      flags.push(arg.slice(1));
    } else {
      args.push(arg);
    }
  }

  return { args, flags, options };
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
    console.log(`biscotto v${VERSION}`);
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

  const { args, flags, options } = parseArgs(rest);
  const ctx: CommandContext = { args, flags, options, root };

  try {
    await command.run(ctx);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
