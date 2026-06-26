import { defineModal } from '@biscotto/core';

export const modalComponents = [
  defineModal({
    customId: 'example-modal',
    fields: [
      { type: 'short', label: 'Name', required: true },
      { type: 'paragraph', label: 'Message', required: false },
    ],
    run(ctx) {
      const name = ctx.fields.get('Name');
      const message = ctx.fields.get('Message');
      ctx.reply({ content: `Hello ${name || 'World'}! ${message || ''}` });
    },
  }),
];
