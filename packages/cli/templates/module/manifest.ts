import type { ModuleManifest } from '@biscotto/core';

export const manifest: ModuleManifest = {
  name: '{{MODULE_NAME}}',
  version: '1.0.0',
  description: '{{DESCRIPTION}}',
  author: {
    name: '{{AUTHOR}}',
    url: '{{AUTHOR_URL}}',
  },
  // storage: { driver: 'json' },  // 'json' | 'sqlite' | 'yaml' | 'mysql'
  license: 'MIT',
  tags: [],
  // dependencies: { 'other-module': '^1.0.0' },
  // provides: ['my-service'],
  // requires: ['other-service'],
};
