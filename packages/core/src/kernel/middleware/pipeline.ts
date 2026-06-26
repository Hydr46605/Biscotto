import type { Interaction, GuildMember } from 'discord.js';
import { CooldownManager } from './cooldown.ts';
import { PermissionChecker } from './permissions.ts';
import { LitLogger } from '../logger.ts';

export interface MiddlewareConfig {
  cooldown?: number;
  permissions?: string[];
}

export interface MiddlewareResult {
  readonly allowed: boolean;
  readonly reply?: string;
}

export class MiddlewarePipeline {
  private cooldowns = new CooldownManager();
  private permissions = new PermissionChecker();

  /**
   * Run all middleware checks for an interaction.
   * Returns { allowed: true } if all checks pass, or { allowed: false, reply } with an error message.
   */
  async run(
    interaction: Interaction,
    config: MiddlewareConfig,
    actionId: string,
  ): Promise<MiddlewareResult> {
    // Cooldown check
    if (config.cooldown && config.cooldown > 0) {
      const userId = interaction.user.id;
      const remaining = this.cooldowns.remaining(userId, actionId);

      if (remaining > 0) {
        const reply = `Cooldown active. Try again in ${remaining}s.`;
        LitLogger.debug('Middleware', `Cooldown blocked ${interaction.user.tag} on ${actionId} (${remaining}s remaining)`);
        return { allowed: false, reply };
      }

      // Set cooldown on successful check
      this.cooldowns.set(userId, actionId, config.cooldown);
    }

    // Permission check (only for guild interactions)
    if (config.permissions && config.permissions.length > 0) {
      if (!interaction.inGuild() || !interaction.member) {
        return { allowed: false, reply: 'This command can only be used in a server.' };
      }

      const member = interaction.member as GuildMember;
      const result = this.permissions.check(member, config.permissions);

      if (!result.allowed) {
        const missing = result.missing.join(', ');
        const reply = `Missing permissions: ${missing}`;
        LitLogger.debug('Middleware', `Permission denied for ${interaction.user.tag}: ${missing}`);
        return { allowed: false, reply };
      }
    }

    return { allowed: true };
  }

  /**
   * Get the cooldown manager (for external use).
   */
  getCooldowns(): CooldownManager {
    return this.cooldowns;
  }

  /**
   * Get the permission checker (for external use).
   */
  getPermissions(): PermissionChecker {
    return this.permissions;
  }
}
