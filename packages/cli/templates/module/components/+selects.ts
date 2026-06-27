import { defineSelectMenu } from '@biscotto/core';

export const selectComponents = [
  defineSelectMenu({
    customId: 'example-select',
    type: 'string',
    options: [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
      { label: 'Option 3', value: '3' },
    ],
    async execute(ctx) {
      await ctx.reply(`You selected: ${ctx.values.join(', ')}`);
    },
  }),
];
