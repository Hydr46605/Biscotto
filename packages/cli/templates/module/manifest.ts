import type { ModuleManifest } from '@biscotto/core/contracts';

export const manifest: ModuleManifest = {
  name: '{{MODULE_NAME}}',
  version: '1.0.0',
  description: '{{DESCRIPTION}}',
  author: {
    name: '{{AUTHOR}}',
    url: '{{AUTHOR_URL}}',
  },
  entry: 'src/index.ts',
  license: 'MIT',
  tags: [],
};
