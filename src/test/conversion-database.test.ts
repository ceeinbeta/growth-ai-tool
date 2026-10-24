import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import type { Database } from '../integrations/supabase/types';
import { funnelSummarySchema } from '../lib/funnel';
function client(admin: boolean, token?: string) {
  const url = process.env['SUPABASE_URL'], key = process.env[admin ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Missing test configuration');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: randomUUID() }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (token) h.set('Authorization', `Bearer ${token}`); else if (key.startsWith('sb_')) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
}
async function fixture(run: (a: ReturnType<typeof client>, m: ReturnType<typeof client>, pid: string, other: string, create: () => Promise<string>) => Promise<void>) {
  const minted = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, 'utf8'));
  const a = client(true), m = client(false, minted.session.access_token), ws = randomUUID(), outsider = randomUUID();
  const ids: string[] = [];
  try {
    expect((await a.from('workspaces').insert([{ id: ws, name: 'Temporary conversion verification', max_products: 100 }, { id: outsider, name: 'Temporary isolated verification', max_products: 100 }])).error).toBeNull();
    expect((await a.from('members').insert({ workspace_id: ws, user_id: minted.session.user.id, role: 'member' })).error).toBeNull();
    const create = async (workspace = ws) => { const id = randomUUID(); ids.push(id); expect((await a.from('products').insert({ id, workspace_id: workspace, name: 'Temporary conversion fixture', description: 'Temporary test copy', url: 'example.com', stage: 'live' })).error).toBeNull(); return id; };
    await run(a, m, await create(), await create(outsider), () => create());
  } finally {
    for (const id of ids) expect((await a.from('products').delete().eq('id', id)).error).toBeNull();
    expect((await a.from('members').delete().eq('workspace_id', ws)).error).toBeNull();
    for (const id of [ws, outsider]) expect((await a.from('workspaces').delete().eq('id', id)).error).toBeNull();
  }
}
const steps = [{ label: 'Visit', kind: 'page', match: '*' }, { label: 'Pricing', kind: 'page', match: '/pricing*' }, { label: 'Signup', kind: 'event', match: 'signup' }];
describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('conversion database rules', () => {
  it('computes first-match ordered unique visitor chains, wildcard pages, events and window', async () => { await fixture(async (a, m, pid) => {
    expect((await m.rpc('replace_funnel_steps', { pid, steps })).error).toBeNull();
    const time = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
    const rows = [
      ['valid', 'pageview', '/', 3], ['valid', 'pageview', '/pricing/start', 2], ['valid', 'signup', '/done', 1], ['valid', 'signup', '/done', .5],
      ['early', 'signup', '/', 4], ['early', 'pageview', '/', 3], ['early', 'pageview', '/pricing', 2], ['early', 'signup', '/', 1],
      ['skip', 'pageview', '/', 3], ['skip', 'signup', '/', 1],
      ['old', 'pageview', '/', 24 * 8], ['old', 'pageview', '/pricing', 24 * 8 - 1], ['old', 'signup', '/', 24 * 8 - 2],
    ].map(([visitor, name, path, hours]) => ({ product_id: pid, visitor_id: String(visitor), name: String(name), path: String(path), created_at: time(Number(hours)) }));
    expect((await a.from('events').insert(rows)).error).toBeNull();
    const s7 = await m.rpc('funnel_summary', { pid, days: 7 }); expect(s7.error).toBeNull();
    expect(funnelSummarySchema.parse(s7.data).steps.map(s => s.visitors)).toEqual([3, 2, 1]);
    const s30 = funnelSummarySchema.parse((await m.rpc('funnel_summary', { pid, days: 30 })).data);
    expect(s30.steps.map(s => s.visitors)).toEqual([4, 3, 2]); expect(s30.steps[2]?.rate_from_previous).toBeCloseTo(2 / 3); expect(s30.steps[2]?.rate_from_first).toBe(.5);
    expect(funnelSummarySchema.parse((await m.rpc('funnel_summary', { pid, days: 90 })).data).total_visitors).toBe(4);
  }); }, 30000);
  it('defaults are computed without stored rows and exact page match excludes prefixes', async () => { await fixture(async (a, m, pid) => {
    expect(funnelSummarySchema.parse((await m.rpc('funnel_summary', { pid })).data).is_default).toBe(true);
    expect((await m.from('funnel_steps').select('*').eq('product_id', pid)).data).toHaveLength(0);
    expect((await m.rpc('replace_funnel_steps', { pid, steps: [{ label: 'Pricing', kind: 'page', match: '/pricing' }] })).error).toBeNull();
    expect((await a.from('events').insert([{ product_id: pid, visitor_id: 'exact', name: 'pageview', path: '/pricing' }, { product_id: pid, visitor_id: 'prefix', name: 'pageview', path: '/pricing/extra' }])).error).toBeNull();
    expect(funnelSummarySchema.parse((await m.rpc('funnel_summary', { pid })).data).total_visitors).toBe(1);
    expect((await m.rpc('replace_funnel_steps', { pid, steps: [] })).error).toBeNull();
    expect((await a.from('products').update({ stage: 'prelaunch' }).eq('id', pid)).error).toBeNull();
    expect(funnelSummarySchema.parse((await m.rpc('funnel_summary', { pid })).data).steps[1]?.label).toBe('Joined the waitlist');
  }); });
  it('enforces six steps and atomic reorder/reset', async () => { await fixture(async (_a, m, pid) => {
    const six = Array.from({ length: 6 }, (_, i) => ({ label: `Step ${i}`, kind: 'page', match: `/${i}` }));
    expect((await m.rpc('replace_funnel_steps', { pid, steps: six })).error).toBeNull();
    expect((await m.from('funnel_steps').insert({ product_id: pid, position: 7, label: 'Seventh', kind: 'page', match: '/7' })).error).not.toBeNull();
    expect((await m.rpc('replace_funnel_steps', { pid, steps: [...six, { label: 'Seventh', kind: 'page', match: '/7' }] })).error?.message).toBe('funnel_step_limit_reached');
    expect((await m.from('funnel_steps').select('id').eq('product_id', pid)).data).toHaveLength(6);
    expect((await m.rpc('replace_funnel_steps', { pid, steps: six.reverse() })).error).toBeNull();
    expect((await m.from('funnel_steps').select('label').eq('product_id', pid).order('position')).data?.[0]?.label).toBe('Step 5');
  }); });
  it('isolates other accounts, denies client inserts, and permits only owned leak status updates', async () => { await fixture(async (a, m, pid, other) => {
    const findings = Array.from({ length: 3 }, () => ({ area: 'Headline', impact: 'high', issue: 'Unclear headline.', fix: 'Name the task.', rewrite: '' }));
    const own = await a.rpc('save_page_audit', { pid, copy: {}, funnel: {}, model_name: 'test', findings });
    const foreign = await a.rpc('save_page_audit', { pid: other, copy: {}, funnel: {}, model_name: 'test', findings });
    expect(own.error).toBeNull(); expect(foreign.error).toBeNull();
    expect((await a.from('events').insert({ product_id: other, visitor_id: 'other', name: 'pageview', path: '/' })).error).toBeNull();
    expect(funnelSummarySchema.parse((await m.rpc('funnel_summary', { pid: other })).data).steps.every(s => s.visitors === 0)).toBe(true);
    for (const table of ['audits', 'leaks', 'funnel_steps'] as const) expect((await m.from(table).select('*').eq('product_id', other)).data).toEqual([]);
    expect((await m.rpc('replace_funnel_steps', { pid: other, steps })).error).not.toBeNull();
    expect((await m.from('audits').insert({ product_id: pid, page_copy: {}, funnel_context: {}, model: 'test' })).error?.code).toBe('42501');
    expect((await m.from('leaks').insert({ product_id: pid, audit_id: String(own.data), area: 'Headline', impact: 'high', issue: 'Unclear headline.', fix: 'Name the task.', rewrite: '' })).error?.code).toBe('42501');
    const leak = (await m.from('leaks').select('*').eq('audit_id', String(own.data))).data?.[0]; if (!leak) throw new Error('Missing test leak');
    expect((await m.from('leaks').update({ status: 'doing' }).eq('id', leak.id)).error).toBeNull();
    expect((await m.from('leaks').select('status').eq('id', leak.id)).data?.[0]?.status).toBe('doing');
    expect((await m.from('leaks').update({ issue: 'Tampered' }).eq('id', leak.id)).error?.code).toBe('42501');
    const foreignLeak = (await a.from('leaks').select('id').eq('audit_id', String(foreign.data))).data?.[0];
    expect((await m.from('leaks').update({ status: 'done' }).eq('id', String(foreignLeak?.id)).select()).data).toEqual([]);
  }); }, 30000);
  it('enforces five audits separately from five profiles in a rolling day', async () => { await fixture(async (a, _m, pid) => {
    expect((await a.from('audit_runs').insert({ product_id: pid, created_at: new Date(Date.now() - 25 * 3600000).toISOString() })).error).toBeNull();
    for (let i = 0; i < 5; i++) expect((await a.rpc('reserve_ai_run', { pid, feature: 'audit-page' })).error).toBeNull();
    expect((await a.rpc('reserve_ai_run', { pid, feature: 'audit-page' })).error?.message).toBe('audit_run_limit_reached');
    expect((await a.rpc('reserve_profile_run', { pid })).error).toBeNull();
  }); }, 30000);
  it('shares a serialized 100-run limit across audit and profile reservations', async () => { await fixture(async (a, _m, pid, _other, create) => {
    const since = new Date(Date.now() - 24 * 3600000).toISOString();
    const counts = await Promise.all(['profile_runs', 'audit_runs'].map(t => a.from(t as 'profile_runs' | 'audit_runs').select('id', { count: 'exact', head: true }).gt('created_at', since)));
    counts.forEach(c => expect(c.error).toBeNull());
    const baseline = counts.reduce((n, c) => n + (c.count ?? 0), 0); expect(baseline).toBeLessThan(99);
    let remaining = 99 - baseline;
    while (remaining > 0) { const p = await create(), n = Math.min(5, remaining); expect((await a.from('audit_runs').insert(Array.from({ length: n }, () => ({ product_id: p })))).error).toBeNull(); remaining -= n; }
    const second = await create();
    const results = await Promise.all([a.rpc('reserve_profile_run', { pid }), a.rpc('reserve_ai_run', { pid: second, feature: 'audit-page' })]);
    expect(results.filter(r => !r.error)).toHaveLength(1); expect(results.filter(r => r.error?.message === 'platform_profile_run_limit_reached')).toHaveLength(1);
  }); }, 90000);
});