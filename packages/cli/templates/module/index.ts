import { defineModule } from '@biscotto/core';
import { manifest } from './manifest.js';
import { pingCommand } from './commands/ping.js';
import { onReady } from './listeners/ready.js';
{{#if buttons}}
import { buttonComponents } from './components/buttons.js';
{{/if}}
{{#if modals}}
import { modalComponents } from './components/modals.js';
{{/if}}
{{#if selects}}
import { selectComponents } from './components/selects.js';
{{/if}}

export default defineModule({
  manifest,
  commands: [
    pingCommand,
  ],
  events: [
    onReady,
  ],
{{#if buttons}}
  buttons: buttonComponents,
{{/if}}
{{#if modals}}
  modals: modalComponents,
{{/if}}
{{#if selects}}
  selects: selectComponents,
{{/if}}
});
