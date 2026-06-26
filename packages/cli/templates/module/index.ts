import { defineModule } from '@biscotto/core';
import { manifest } from './manifest.ts';
import { commands, events } from './registry.ts';

export default defineModule({
  manifest,
  commands,
  events,
});
