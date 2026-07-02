import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

const TEMPLATES_DIR = resolve(import.meta.dirname, '..', 'templates');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateVars {
  [key: string]: string | boolean;
}

export interface CopyOptions {
  vars?: TemplateVars;
  features?: string[];
  exclude?: string[];
}

// ── Template Engine ───────────────────────────────────────────────────────────

/**
 * Replace {{PLACEHOLDER}} markers in content with values from vars.
 */
export function render(content: string, vars: TemplateVars): string {
  // Process conditional blocks first: {{#if feature}}...{{/if}}
  content = processConditionals(content, vars);

  // Process negated conditionals: {{#unless feature}}...{{/unless}}
  content = processUnless(content, vars);

  // Replace simple placeholders
  return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return val ?? `{{${key}}}`;
  });
}

function processConditionals(content: string, vars: TemplateVars): string {
  const regex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  return content.replace(regex, (_, key: string, block: string) => {
    const val = vars[key];
    if (val === true || val === 'true') {
      return render(block, vars);
    }
    return '';
  });
}

function processUnless(content: string, vars: TemplateVars): string {
  const regex = /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
  return content.replace(regex, (_, key: string, block: string) => {
    const val = vars[key];
    if (val === false || val === 'false' || val === undefined) {
      return render(block, vars);
    }
    return '';
  });
}

/**
 * Check if a content string has any placeholders or conditionals.
 */
function hasTemplateSyntax(content: string): boolean {
  return /\{\{/.test(content);
}

/**
 * Recursively copy a directory from src to dest, rendering templates.
 */
export function copyTemplate(
  src: string,
  dest: string,
  options: CopyOptions = {},
): void {
  const { vars = {}, features = [], exclude = [] } = options;
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    // Skip excluded files
    if (exclude.includes(entry.name)) continue;

    // Skip feature-gated files
    if (entry.name.startsWith('+') && !entry.isDirectory()) {
      const feature = entry.name.slice(1).split('.')[0];
      if (!features.includes(feature)) continue;
    }

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyTemplate(srcPath, destPath, options);
    } else {
      mkdirSync(dest, { recursive: true });
      const content = readFileSync(srcPath, 'utf-8');

      // Merge features into vars for conditional processing
      const allVars: TemplateVars = { ...vars };
      for (const f of features) {
        allVars[f] = true;
      }

      const rendered = hasTemplateSyntax(content) ? render(content, allVars) : content;

      // Strip the leading `+` feature-gate prefix only.
      const finalName = entry.name.startsWith('+')
        ? entry.name.slice(1)
        : entry.name;

      writeFileSync(join(dest, finalName), rendered, 'utf-8');
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
  const rendered = hasTemplateSyntax(content) ? render(content, vars) : content;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, rendered, 'utf-8');
}

/**
 * Write a file directly with rendered content.
 */
export function writeFile(dest: string, content: string, vars: TemplateVars = {}): void {
  const rendered = hasTemplateSyntax(content) ? render(content, vars) : content;
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, rendered, 'utf-8');
}
