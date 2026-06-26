import pingCommand from './commands/ping.ts';
import versionCommand from './commands/version.ts';
import readyEvent from './listeners/ready.ts';

export const commands = [pingCommand, versionCommand];
export const events = [readyEvent];
