interface CooldownEntry {
  expiresAt: number;
}

export class CooldownManager {
  private cooldowns = new Map<string, CooldownEntry>();

  /**
   * Check if a user is on cooldown for a specific action.
   * Returns the remaining seconds, or 0 if not on cooldown.
   */
  remaining(userId: string, actionId: string): number {
    const key = `${userId}:${actionId}`;
    const entry = this.cooldowns.get(key);
    if (!entry) return 0;

    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.cooldowns.delete(key);
      return 0;
    }

    return Math.ceil((entry.expiresAt - now) / 1000);
  }

  /**
   * Check if a user is on cooldown. Returns true if on cooldown.
   */
  isOnCooldown(userId: string, actionId: string): boolean {
    return this.remaining(userId, actionId) > 0;
  }

  /**
   * Set a cooldown for a user on a specific action.
   */
  set(userId: string, actionId: string, seconds: number): void {
    const key = `${userId}:${actionId}`;
    this.cooldowns.set(key, {
      expiresAt: Date.now() + seconds * 1000,
    });
  }

  /**
   * Clear a specific cooldown.
   */
  clear(userId: string, actionId: string): void {
    const key = `${userId}:${actionId}`;
    this.cooldowns.delete(key);
  }

  /**
   * Clear all cooldowns for a user.
   */
  clearUser(userId: string): void {
    const prefix = `${userId}:`;
    for (const key of this.cooldowns.keys()) {
      if (key.startsWith(prefix)) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Clear all cooldowns.
   */
  clearAll(): void {
    this.cooldowns.clear();
  }
}
