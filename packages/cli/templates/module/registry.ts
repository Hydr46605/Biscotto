import pingCommand from './commands/ping.ts';
import readyEvent from './listeners/ready.ts';

export const commands = [pingCommand];
export const events = [readyEvent];
