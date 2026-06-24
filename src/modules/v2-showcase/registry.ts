import type { ModuleRegistration } from '../../contracts/module.contract.ts';
import { showcaseCommand } from './commands/showcase.ts';
import { showcaseInteractions } from './listeners/showcase-interactions.ts';

export function register(): ModuleRegistration {
  return {
    commands: [showcaseCommand],
    events: [showcaseInteractions],
  };
}
