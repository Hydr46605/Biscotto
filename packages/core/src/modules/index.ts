import type { BiscottoModule } from '../contracts/module.contract.ts';
import { zeroModule } from './zero/index.ts';

export const modules: BiscottoModule[] = [
  zeroModule,
];
