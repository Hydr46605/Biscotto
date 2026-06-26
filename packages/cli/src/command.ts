// ── Command Interface ──────────────────────────────────────────────────────────

export interface CommandContext {
  readonly args: string[];
  readonly flags: string[];
  readonly options: Record<string, string>;
  readonly root: string;
}

export interface Command {
  readonly name: string;
  readonly description: string;
  readonly usage?: string;
  run(ctx: CommandContext): Promise<void>;
}
