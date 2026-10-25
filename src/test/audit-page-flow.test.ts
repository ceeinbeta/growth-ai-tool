// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), call: vi.fn(), context: null as any }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => ({ middleware: () => ({ inputValidator: (validate: any) => ({ handler: (handler: any) => (input: any) => handler({ data: validate(input.data), context: m.context }) }) }) }) }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { rpc: m.rpc, from: m.from } }));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: () => new Request('https://growloop.net') }));
vi.mock('@/lib/ai/audit-responses.server.ts', () => ({ createAuditResponsesCall: m.call }));
import { auditPage } from '@/lib/audit-page.functions';
const product = { id: '11111111-1111-4111-8111-111111111111', url: 'publicsite.net', name: 'Fixture', one_liner: null, audience: null, category: null, stage: 'live' };
const findings = Array.from({ length: 3 }, (_, i) => ({ area: `Area ${i}`, impact: 'high', issue: 'Actual copy is unclear.', fix: 'Name the task.', rewrite: '' }));
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('LOVABLE_API_KEY', 'mock-only');
  m.context = { supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: product }) }) }) }), rpc: async () => ({ data: { total_visitors: 0, is_default: true, steps: [] } }) } };
  m.rpc.mockResolvedValue({ data: null, error: null });
  m.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), insert: async () => ({ error: null }) }));
  m.call.mockReturnValue({ result: { output: Promise.resolve({ leaks: findings }), usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }), finishReason: Promise.resolve('stop') }, gateway: { getRunId: () => undefined } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`<html><body><main>${'Real readable page copy. '.repeat(30)}</main></body></html>`, { headers: { 'content-type': 'text/html' } })));
});
import { afterEach } from 'vitest';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('fetched audit flow with mocked fetch and AI', () => {
  it('reserves fetching, keeps daily AI reservation and usage, saves provenance with findings', async () => {
    const result = await auditPage({ data: { productId: product.id, days: 30, path: '/pricing' } });
    expect(result.ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledWith('reserve_audit_fetch', { pid: product.id });
    expect(m.rpc).toHaveBeenCalledWith('reserve_ai_run', { pid: product.id, feature: 'audit-page' });
    expect(m.from).toHaveBeenCalledWith('ai_usage');
    expect(m.rpc).toHaveBeenCalledWith('save_fetched_page_audit', expect.objectContaining({ pid: product.id, page_url: 'https://publicsite.net/pricing', fetch_time: expect.any(String), findings }));
    expect(m.call.mock.calls[0]?.[2]?.[0]?.content).toContain('Real readable page copy');
  });
  it('thin pages consume no AI run and return paste fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><body><main>Short</main></body></html>', { headers: { 'content-type': 'text/html' } })));
    expect(await auditPage({ data: { productId: product.id, days: 30 } })).toMatchObject({ ok: false, fallback: true });
    expect(m.call).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalledWith('reserve_ai_run', expect.anything());
  });
  it('fetch cap prevents both fetching and AI', async () => {
    m.rpc.mockResolvedValue({ error: { message: 'audit_fetch_limit_reached' } });
    expect(await auditPage({ data: { productId: product.id, days: 30 } })).toMatchObject({ ok: false, fallback: true });
    expect(fetch).not.toHaveBeenCalled(); expect(m.call).not.toHaveBeenCalled();
  });
  it('unavailable caller product never reserves, fetches or calls AI', async () => {
    m.context.supabase.from = () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) });
    expect((await auditPage({ data: { productId: product.id, days: 30 } })).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(m.call).not.toHaveBeenCalled();
  });
  it('paste fallback uses existing saver and never fetches', async () => {
    expect((await auditPage({ data: { productId: product.id, days: 30, copy: { path: '', headline: 'Real headline', subheadline: '', button: '', notes: '' } } })).ok).toBe(true);
    expect(fetch).not.toHaveBeenCalled(); expect(m.rpc).toHaveBeenCalledWith('save_page_audit', expect.objectContaining({ findings }));
  });
});