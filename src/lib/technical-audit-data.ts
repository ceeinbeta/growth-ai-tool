import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Latest technical audit with its findings, plus the last 5 runs for history. Member-scoped by RLS. */
export const technicalAuditQuery = (id: string) => queryOptions({
  queryKey: ['technical-audit', id],
  queryFn: async () => {
    const runs = await supabase.from('technical_audits').select('*').eq('product_id', id).order('created_at', { ascending: false }).limit(5);
    if (runs.error) throw runs.error;
    const latest = runs.data?.[0] ?? null;
    const findings = latest
      ? await supabase.from('technical_audit_findings').select('*').eq('audit_id', latest.id).order('position')
      : { data: [], error: null };
    if (findings.error) throw findings.error;
    return { runs: runs.data ?? [], latest, findings: findings.data ?? [] };
  },
});
