import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { StatusChip, sourceTypes, sourceLabels } from '@/components/SourceChip';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(`${dir}/${entry.name}`) : /\.tsx$/.test(entry.name) ? [`${dir}/${entry.name}`] : []);
}
describe('Brambly labeled source safeguards', () => {
  for (const type of sourceTypes) {
    it(`labels ${type} with the required source name`, () => {
      render(<StatusChip type={type} />);
      const chip = screen.getByText(sourceLabels[type]);
      expect(chip.className).toContain(`status-${type}`);
      expect(chip.textContent).toBe({ live: 'LIVE', coming: 'SOON', sample: 'SAMPLE DATA', measured: 'MEASURED', estimated: 'ESTIMATED', benchmark: 'BENCHMARK', ai: 'AI-written' }[type]);
    });
  }
});
