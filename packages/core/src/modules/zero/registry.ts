import pingCommand from './commands/ping.js';
import versionCommand from './commands/version.js';
import readyEvent from './listeners/ready.js';

export const commands = [pingCommand, versionCommand];
export const events = [readyEvent];
