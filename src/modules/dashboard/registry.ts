import type { ModuleRegistration } from '../../contracts/module.contract.ts';
import { profileCommand } from './commands/profile.ts';
import { dashboardActions } from './listeners/dashboard-actions.ts';

export function register(): ModuleRegistration {
  return {
    commands: [profileCommand],
    events: [dashboardActions],
  };
}
