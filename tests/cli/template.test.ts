import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, copyTemplate } from '../../packages/cli/src/template.ts';
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let srcDir: string;
let destDir: string;

beforeEach(() => {
  srcDir = join(tmpdir(), `biscotto-tpl-src-${Date.now()}`);
  destDir = join(tmpdir(), `biscotto-tpl-dest-${Date.now()}`);
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(destDir, { recursive: true });
});

afterEach(() => {
  rmSync(srcDir, { recursive: true, force: true });
  rmSync(destDir, { recursive: true, force: true });
});

describe('render', () => {
  it('substitutes simple placeholders', () => {
    expect(render('Hello {{NAME}}!', { NAME: 'World' })).toBe('Hello World!');
  });

  it('keeps unknown placeholders verbatim', () => {
    expect(render('{{KNOWN}} vs {{UNKNOWN}}', { KNOWN: 'x' })).toBe('x vs {{UNKNOWN}}');
  });

  it('processes {{#if FEATURE}} blocks', () => {
    expect(render('{{#if buttons}}BUTTONS{{/if}}', { buttons: true })).toBe('BUTTONS');
    expect(render('{{#if buttons}}BUTTONS{{/if}}', { buttons: false })).toBe('');
    expect(render('{{#if buttons}}BUTTONS{{/if}}', {})).toBe('');
  });

  it('processes {{#unless FEATURE}} blocks', () => {
    expect(render('{{#unless buttons}}NO_BUTTONS{{/unless}}', { buttons: true })).toBe('');
    expect(render('{{#unless buttons}}NO_BUTTONS{{/unless}}', {})).toBe('NO_BUTTONS');
  });

  it('recursively processes conditionals containing placeholders', () => {
    expect(render('{{#if buttons}}btn/{{NAME}}{{/if}}', { buttons: true, NAME: 'go' }))
      .toBe('btn/go');
  });
});

describe('copyTemplate', () => {
  it('copies a tree and renders placeholders', () => {
    writeFileSync(join(srcDir, 'hello.txt'), 'Hello {{WHO}}');
    writeFileSync(join(srcDir, 'plain.txt'), 'plain text');
    copyTemplate(srcDir, destDir, { vars: { WHO: 'Biscotto' } });
    expect(readFileSync(join(destDir, 'hello.txt'), 'utf-8')).toBe('Hello Biscotto');
    expect(readFileSync(join(destDir, 'plain.txt'), 'utf-8')).toBe('plain text');
  });

  it('honors +feature.ts filename gating', () => {
    writeFileSync(join(srcDir, 'always.ts'), 'A');
    writeFileSync(join(srcDir, '+buttons.ts'), 'B');
    writeFileSync(join(srcDir, '+modals.ts'), 'M');

    copyTemplate(srcDir, destDir, { features: ['buttons'] });
    const files = readdirSync(destDir).sort();
    expect(files).toEqual(['always.ts', 'buttons.ts']);
    expect(readFileSync(join(destDir, 'buttons.ts'), 'utf-8')).toBe('B');
  });

  it('produces no feature files when no features requested', () => {
    writeFileSync(join(srcDir, '+buttons.ts'), 'B');
    writeFileSync(join(srcDir, 'base.ts'), 'X');
    copyTemplate(srcDir, destDir);
    expect(readdirSync(destDir)).toEqual(['base.ts']);
  });
});
