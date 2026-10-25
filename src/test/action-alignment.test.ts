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
    expect(button).toContain('default: "h-10 px-4 py-2"');
    expect(button).toContain('lg: "h-12 px-6 py-2"');
    for (const path of ['src/routes/index.tsx', 'src/routes/features.tsx', 'src/routes/auth.tsx', 'src/routes/_authenticated/overview.tsx', 'src/routes/_authenticated/ai-search-visibility.tsx', 'src/routes/_authenticated/admin.tsx', 'src/routes/_authenticated/products.new.tsx', 'src/components/PageAudit.tsx', 'src/components/ProductProfile.tsx', 'src/components/InstallCheck.tsx', 'src/components/WaitlistForm.tsx', 'src/components/ui/dialog.tsx', 'src/components/ui/alert-dialog.tsx']) {
      expect(readFileSync(path, 'utf8')).toContain('ActionRow');
    }
  });
});