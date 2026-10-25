export const sourceTypes = ['live', 'coming', 'sample', 'measured', 'estimated', 'benchmark', 'ai'] as const;
export type SourceType = typeof sourceTypes[number];
export const sourceLabels: Record<SourceType, string> = { live: 'LIVE', coming: 'COMING NEXT', sample: 'SAMPLE DATA', measured: 'MEASURED', estimated: 'ESTIMATED', benchmark: 'BENCHMARK', ai: 'AI-WRITTEN' };
export function StatusChip({ type }: { type: SourceType }) {
  return <span className={`status-chip status-${type}`}>{sourceLabels[type]}</span>;
}
export function SourceChip({ text }: { text: string }) {
  const type = /measured/i.test(text) ? 'measured' : /sample/i.test(text) ? 'sample' : /estimated/i.test(text) ? 'estimated' : /benchmark/i.test(text) ? 'benchmark' : /audit|AI-written/i.test(text) ? 'ai' : null;
  return type ? <><StatusChip type={type} /><br /></> : null;
}
