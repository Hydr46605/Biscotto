import type { ModuleManifest } from '../../contracts/module.contract.ts';

export const manifest: ModuleManifest = {
  name: 'zero',
  version: '1.0.0',
  description: 'Core module — base scaffold for Biscotto',
  entry: 'src/index.ts',
  license: 'MIT',
  tags: ['core', 'builtin'],
};
