import type { Events } from 'discord.js';

export interface EventDefinition {
  readonly event: Events;
  readonly once?: boolean;
  execute(...args: unknown[]): Promise<void>;
}
