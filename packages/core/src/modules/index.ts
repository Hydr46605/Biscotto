import type { BiscottoModule } from '../contracts/module.contract.js';
import { zeroModule } from './zero/index.js';

export const modules: BiscottoModule[] = [
  zeroModule,
];
