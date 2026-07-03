import type { ModuleManifest } from '../../contracts/module.contract.js';

export const manifest: ModuleManifest = {
  name: 'zero',
  version: '1.0.0',
  description: 'Core module — base scaffold for Biscotto',
  author: {
    name: 'Hydr46605',
    url: 'https://github.com/Hydr46605',
  },
  entry: 'src/index.js',
  license: 'MIT',
  tags: ['core', 'builtin'],
};
