import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sources(`${dir}/${entry.name}`) : entry.name.endsWith('.tsx') ? [`${dir}/${entry.name}`] : []);
}

// Lint-style check of authored CTA classes, not rendered markup or snapshots.
function overrides(source: string) {
  const file = ts.createSourceFile('screen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (/^(Button|AlertDialogAction|AlertDialogCancel)$/.test(node.tagName.getText(file))) {
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'className' && attribute.initializer) {
            const value = attribute.initializer.getText(file);
            if (/(?:^|[\s"'`])(?:[\w-]+:)*(?:(?:min-|max-)?h-|m[trblxyse]?-)/.test(value)) found.push(value);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found;
}

describe('shared CTA conventions', () => {
  it('rejects screen-specific button heights and alignment margin hacks', () => {
    const files = [...sources('src/components').filter(p => !p.includes('/ui/')), ...sources('src/routes')];
    expect(files.flatMap(path => overrides(readFileSync(path, 'utf8')).map(value => ({ path, value })))).toEqual([]);
    expect(overrides('<Button className="h-11 mt-4">Save</Button>')).toHaveLength(1);
    expect(overrides('<Button className="min-h-12">Save</Button>')).toHaveLength(1);
    expect(overrides('<Button className="justify-self-start">Save</Button>')).toHaveLength(0);
  });
  it('keeps sizing centralized and adopts shared rows at every action surface', () => {
    const button = readFileSync('src/components/ui/button.tsx', 'utf8');
    expect(button).toContain('default: "h-10 px-4 py-2 text-base"');
    expect(button).toContain('lg: "h-12 px-6 py-2 text-md"');
    for (const path of ['src/routes/index.tsx', 'src/routes/features.tsx', 'src/routes/auth.tsx', 'src/routes/_authenticated/overview.tsx', 'src/routes/_authenticated/ai-search-visibility.tsx', 'src/routes/_authenticated/admin.tsx', 'src/routes/_authenticated/products.new.tsx', 'src/components/PageAudit.tsx', 'src/components/ProductProfile.tsx', 'src/components/InstallCheck.tsx', 'src/components/WaitlistForm.tsx', 'src/components/ui/dialog.tsx', 'src/components/ui/alert-dialog.tsx']) {
      expect(readFileSync(path, 'utf8')).toContain('ActionRow');
    }
  });
});

// The shared type scale lives in src/styles.css (--text-* tokens plus the
// .public-* classes). Raw sizes outside the scale fail here.
const offScale = /(?:^|[\s:"'`])(?:[\w-]+:)*text-(?:4xl|5xl|6xl|7xl|8xl|9xl|\[[^\]]*\])(?![-\w\]])/;
describe('shared type scale', () => {
  it('forbids font sizes outside the shared scale in screens and components', () => {
    const files = [...sources('src/components').filter(p => !p.includes('/ui/')), ...sources('src/routes')];
    expect(files.filter(path => offScale.test(readFileSync(path, 'utf8')))).toEqual([]);
    // Concrete forbidden/allowed regressions, not a vacuous scanner.
    expect(offScale.test('className="text-5xl font-bold"')).toBe(true);
    expect(offScale.test('className="md:text-4xl"')).toBe(true);
    expect(offScale.test('className="text-[32px]"')).toBe(true);
    expect(offScale.test('className="text-3xl font-extrabold"')).toBe(false);
    expect(offScale.test('className="text-sm text-muted-foreground"')).toBe(false);
  });
  it('defines the scale tokens and public clamp classes in the theme', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    for (const token of ['--text-xs: 12px', '--text-sm: 13px', '--text-base: 15px', '--text-md: 16px', '--text-lg: 17px', '--text-xl: 20px', '--text-3xl: 27px', '--text-nav: 14px']) expect(css).toContain(token);
    expect(css).toContain('clamp(34px, 5vw, 52px)');
    expect(css).toContain('clamp(26px, 3.4vw, 36px)');
    expect(css).toContain('max-width: 1120px');
    expect(css).toContain('max-width: 68ch');
  });
  it('keeps all font roles in DM Sans without reviving the superseded fonts', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    for (const role of ['label', 'sans', 'display', 'mono']) expect(css).toMatch(new RegExp(`--font-${role}: "DM Sans"`));
    const sourcesText = [css, ...sources('src/components').concat(sources('src/routes')).map(path => readFileSync(path, 'utf8'))].join('\n');
    expect(sourcesText).not.toMatch(/Manrope|DM Mono|Georgia|font-family:\s*monospace/);
  });
});