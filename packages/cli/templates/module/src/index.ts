import { defineModule, defineCommand } from '@biscotto/core';
{{#if buttons}}import { defineButton } from '@biscotto/core';
{{/if}}{{#if modals}}import { defineModal } from '@biscotto/core';
{{/if}}{{#if selects}}import { defineSelectMenu } from '@biscotto/core';
{{/if}}

const ping = defineCommand({
  name: 'ping',
  description: 'Check if the bot is alive',
  async execute(ctx) {
    await ctx.reply('Pong!');
  },
});{{#if buttons}}

const greetBtn = defineButton({
  customId: 'greet-btn',
  async execute(ctx) {
    await ctx.reply('Hello from {{MODULE_NAME}}!');
  },
});{{/if}}{{#if selects}}

const roleSelect = defineSelectMenu({
  customId: 'role-select',
  type: 'string',
  options: [
    { label: 'Admin', value: 'admin' },
    { label: 'User',  value: 'user'  },
  ],
  async execute(ctx) {
    await ctx.reply(`Selected: ${ctx.values.join(', ')}`);
  },
});{{/if}}{{#if modals}}

const feedbackModal = defineModal({
  customId: 'feedback',
  fields: [
    { type: 'paragraph', label: 'Feedback', required: true },
  ],
  async execute(ctx) {
    await ctx.reply('Thanks for the feedback!');
  },
});{{/if}}

export default defineModule({
  manifest: {
    name: '{{MODULE_NAME}}',
    version: '0.1.0',
    description: '{{DESCRIPTION}}',
    {{#if storage}}storage: { driver: 'json' },{{/if}}
  },
  commands: [ping],{{#if buttons}}
  buttons: [greetBtn],{{/if}}{{#if selects}}
  selectMenus: [roleSelect],{{/if}}{{#if modals}}
  modals: [feedbackModal],{{/if}}
  onLoad(ctx) {
    ctx.logger.info('{{MODULE_NAME}} loaded');
  },
});

