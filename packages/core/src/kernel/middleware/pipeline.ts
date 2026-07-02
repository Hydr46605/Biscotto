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

/**
 * Runs pre-execution middleware (cooldown read + permission check).
 *
 * Important: cooldown is NO LONGER set here on success. That used to penalize
 * users for handler errors — if `command.execute(...)` threw, the user was
 * still locked out. The router now calls `commitCooldown()` only after a
 * successful invocation, so failed handler runs free the user to retry.
 */
export class MiddlewarePipeline {
  private cooldowns = new CooldownManager();
  private permissions = new PermissionChecker();

  async run(
    interaction: Interaction,
    config: MiddlewareConfig,
    actionId: string,
  ): Promise<MiddlewareResult> {
    // Cooldown check (read-only).
    if (config.cooldown && config.cooldown > 0) {
      const userId = interaction.user.id;
      const remaining = this.cooldowns.remaining(userId, actionId);

      if (remaining > 0) {
        const reply = `Cooldown active. Try again in ${remaining}s.`;
        LitLogger.debug('Middleware', `Cooldown blocked ${interaction.user.tag} on ${actionId} (${remaining}s remaining)`);
        return { allowed: false, reply };
      }
    }

    // Permission check (only for guild interactions).
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
   * Apply the cooldown AFTER the handler succeeded. Called by the router
   * once `execute()` resolves without throwing.
   */
  commitCooldown(
    interaction: Interaction,
    config: MiddlewareConfig,
    actionId: string,
  ): void {
    if (config.cooldown && config.cooldown > 0) {
      this.cooldowns.set(interaction.user.id, actionId, config.cooldown);
    }
  }

  getCooldowns(): CooldownManager {
    return this.cooldowns;
  }

  getPermissions(): PermissionChecker {
    return this.permissions;
  }
}
