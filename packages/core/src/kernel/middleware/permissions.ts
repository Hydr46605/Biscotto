import { PermissionFlagsBits, type GuildMember } from 'discord.js';

export type PermissionString = keyof typeof PermissionFlagsBits;

export interface PermissionCheckResult {
  readonly allowed: boolean;
  readonly missing: string[];
}

export class PermissionChecker {
  /**
   * Check if a member has all required permissions.
   */
  check(member: GuildMember, permissions: string[]): PermissionCheckResult {
    if (permissions.length === 0) {
      return { allowed: true, missing: [] };
    }

    const memberPerms = member.permissions;
    const missing: string[] = [];

    for (const perm of permissions) {
      const flag = PermissionFlagsBits[perm as PermissionString];
      if (flag === undefined) continue;
      if (!memberPerms.has(flag)) {
        missing.push(perm);
      }
    }

    return {
      allowed: missing.length === 0,
      missing,
    };
  }

  /**
   * Format missing permissions into a user-friendly string.
   */
  formatMissing(missing: string[]): string {
    if (missing.length === 0) return '';
    return missing.map(p => `\`${p}\``).join(', ');
  }
}
