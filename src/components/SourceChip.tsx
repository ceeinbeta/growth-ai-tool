export const sourceTypes = ['live', 'coming', 'sample', 'measured', 'estimated', 'benchmark', 'ai'] as const;
export type SourceType = typeof sourceTypes[number];
export const sourceLabels: Record<SourceType, string> = { live: 'LIVE', coming: 'SOON', sample: 'SAMPLE DATA', measured: 'MEASURED', estimated: 'ESTIMATED', benchmark: 'BENCHMARK', ai: 'AI-written' };
export function StatusChip({ type }: { type: SourceType }) {
  return <span className={`status-chip status-${type}`}>{sourceLabels[type]}</span>;
}
export function SourceChip({ text, inline = false }: { text: string; inline?: boolean }) {
  const type = /measured/i.test(text) ? 'measured' : /sample/i.test(text) ? 'sample' : /estimated/i.test(text) ? 'estimated' : /benchmark/i.test(text) ? 'benchmark' : /audit|AI-written/i.test(text) ? 'ai' : null;
  if (type === 'sample') return <><span className="status-chip status-sample">SAMPLE RUNS</span>{!inline && <br />}</>;
  return type ? <><StatusChip type={type} />{!inline && <br />}</> : null;
}
