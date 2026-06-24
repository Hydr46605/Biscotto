import type { HydrottoModule } from '../../contracts/module.contract.ts';
import { manifest } from './manifest.ts';
import { register } from './registry.ts';

export const dashboardModule: HydrottoModule = {
  manifest,
  register,
};
