import { defineModule, defineConfig } from '@biscotto/core';
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

const moduleConfig = defineConfig({
  schema: {
    greeting: { type: 'string', description: 'Greeting message', default: 'Hello!' },
    enabled: { type: 'boolean', description: 'Enable/disable feature', default: true },
  },
  defaults: {
    greeting: 'Hello!',
    enabled: true,
  },
});

export default defineModule({
  manifest,
  config: moduleConfig,
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
  onLoad(ctx) {
    const greeting = ctx.config.get<string>(manifest.name, 'greeting');
    ctx.logger.info(`${manifest.name} loaded with greeting: ${greeting}`);
  },
});
