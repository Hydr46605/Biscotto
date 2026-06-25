import type { ModuleRegistration } from '../../contracts/module.contract.ts';
import { pingCommand } from './commands/ping.ts';
import { versionCommand } from './commands/version.ts';
import { readyEvent } from './listeners/ready.ts';

export function register(): ModuleRegistration {
  return {
    commands: [pingCommand, versionCommand],
    events: [readyEvent],
  };
}
