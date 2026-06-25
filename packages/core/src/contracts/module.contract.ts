import type {
  Client,
  Events,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';

// ── Module Manifest ───────────────────────────────────────────────────────────

export interface ModuleAuthor {
  readonly name: string;
  readonly url?: string;
}

export interface ModuleManifest {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: ModuleAuthor;
  readonly entry?: string;
  readonly build?: string;
  readonly engine?: string;
  readonly dependencies?: Record<string, string>;
  readonly repository?: string;
  readonly license?: string;
  readonly tags?: string[];
}

/**
 * Raw biscotto.json shape as it appears on disk.
 * Identical to ModuleManifest but represents the deserialized JSON.
 */
export type BiscottoManifest = ModuleManifest;

// ── Module Registration ───────────────────────────────────────────────────────

export interface CommandDefinition {
  readonly data: SlashCommandBuilder;
  execute(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void>;
}

export interface EventDefinition {
  readonly event: Events;
  readonly once?: boolean;
  execute(...args: unknown[]): Promise<void>;
}

export interface ModuleRegistration {
  readonly commands?: CommandDefinition[];
  readonly events?: EventDefinition[];
}

// ── Module Interface ──────────────────────────────────────────────────────────

export interface BiscottoModule {
  readonly manifest: ModuleManifest;
  register(): ModuleRegistration;
  onInit?(client: Client): Promise<void> | void;
  onDestroy?(): Promise<void> | void;
}
