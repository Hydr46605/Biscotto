// Example select-menu handler — emitted when the stack includes selects.
import { defineSelectMenu } from '@biscotto/core';

export const roleSelect = defineSelectMenu({
  customId: 'role-select',
  type: 'string',
  options: [
    { label: 'Admin', value: 'admin' },
    { label: 'Mod',   value: 'mod'   },
    { label: 'User',  value: 'user'  },
  ],
  async execute(ctx) {
    await ctx.reply(`Roles selected: ${ctx.values.join(', ')}`);
  },
});
