import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { StatusChip, sourceTypes, sourceLabels } from '@/components/SourceChip';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(`${dir}/${entry.name}`) : /\.tsx$/.test(entry.name) ? [`${dir}/${entry.name}`] : []);
}
describe('Brand identity 01 d15 safeguards', () => {
  it('forbids lime text tokens in components, including on Paper and white surfaces', () => {
    const forbidden = /(?:^|[\s:"'`])(?:[\w-]+:)*text-(?:primary|signal|brand-green|brand-bright)(?![-\w])/;
    const files = [...sourceFiles('src/components'), ...sourceFiles('src/routes')];
    expect(files.filter(path => forbidden.test(readFileSync(path, 'utf8')))).toEqual([]);
    // Concrete forbidden combination regression, not a vacuous scanner.
    expect(forbidden.test('bg-background text-primary')).toBe(true);
    expect(forbidden.test('bg-card hover:text-signal')).toBe(true);
    expect(forbidden.test('bg-primary text-primary-foreground')).toBe(false);
    expect(forbidden.test('bg-card text-brand-green')).toBe(true);
  });
  for (const type of sourceTypes) {
    it(`labels ${type} with the required source name`, () => {
      render(<StatusChip type={type} />);
      const chip = screen.getByText(sourceLabels[type]);
      expect(chip.className).toContain(`status-${type}`);
      expect(chip.textContent).toBe({ live: 'LIVE', coming: 'COMING NEXT', sample: 'SAMPLE DATA', measured: 'MEASURED', estimated: 'ESTIMATED', benchmark: 'BENCHMARK', ai: 'AI-written' }[type]);
    });
  }
});
