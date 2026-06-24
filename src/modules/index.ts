import type { HydrottoModule } from '../contracts/module.contract.ts';
import { v2ShowcaseModule } from './v2-showcase/index.ts';
import { dashboardModule } from './dashboard/index.ts';

export const modules: HydrottoModule[] = [
  v2ShowcaseModule,
  dashboardModule,
];
