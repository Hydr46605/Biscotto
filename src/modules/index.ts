import type { BiscottoModule } from '../contracts/module.contract.ts';
import { v2ShowcaseModule } from './v2-showcase/index.ts';
import { dashboardModule } from './dashboard/index.ts';

export const modules: BiscottoModule[] = [
  v2ShowcaseModule,
  dashboardModule,
];
