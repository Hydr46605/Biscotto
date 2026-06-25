import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

const TEMPLATES_DIR = resolve(import.meta.dirname, '..', 'templates');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateVars {
  [key: string]: string;
}

// ── Template Engine ───────────────────────────────────────────────────────────

/**
 * Replace {{PLACEHOLDER}} markers in content with values from vars.
 * Unmatched placeholders are left as-is.
 */
export function render(content: string, vars: TemplateVars): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return vars[key] ?? `{{${key}}}`;
  });
}

/**
 * Recursively copy a directory from src to dest, rendering templates.
 * Files with .ts extension are rendered with vars.
 * Other files are copied as-is.
 */
export function copyTemplate(
  src: string,
  dest: string,
  vars: TemplateVars = {},
): void {
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyTemplate(srcPath, destPath, vars);
    } else {
      mkdirSync(dest, { recursive: true });
      const content = readFileSync(srcPath, 'utf-8');
      const rendered = render(content, vars);
      writeFileSync(destPath, rendered, 'utf-8');
    }
  }
}

/**
 * Get the templates directory path.
 */
export function getTemplatesDir(): string {
  return TEMPLATES_DIR;
}

/**
 * Check if templates directory exists.
 */
export function hasTemplates(): boolean {
  return existsSync(TEMPLATES_DIR);
}

/**
 * Copy a single file, rendering templates.
 */
export function copyFile(src: string, dest: string, vars: TemplateVars = {}): void {
  const content = readFileSync(src, 'utf-8');
  const rendered = render(content, vars);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, rendered, 'utf-8');
}
