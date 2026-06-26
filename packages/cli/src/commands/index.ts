import type { Command } from '../command.ts';
import { initCommand } from './init.ts';
import { createCommand } from './create.ts';
import { addCommand } from './add.ts';
import { removeCommand } from './remove.ts';
import { listCommand } from './list.ts';
import { devCommand } from './dev.ts';
import { startCommand } from './start.ts';
import { stopCommand } from './stop.ts';
import { restartCommand } from './restart.ts';
import { statusCommand } from './status.ts';
import { updateCommand } from './update.ts';
import { searchCommand } from './search.ts';
import { packCommand } from './pack.ts';
import { publishCommand } from './publish.ts';

export const commands: Command[] = [
  initCommand,
  createCommand,
  addCommand,
  removeCommand,
  listCommand,
  devCommand,
  startCommand,
  stopCommand,
  restartCommand,
  statusCommand,
  updateCommand,
  searchCommand,
  packCommand,
  publishCommand,
];
