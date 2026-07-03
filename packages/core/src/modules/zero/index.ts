import { defineModule } from '../../kernel/define.js';
import { manifest } from './manifest.js';
import { commands, events } from './registry.js';

export const zeroModule = defineModule({
  manifest,
  commands,
  events,
});
