import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import type { Database } from '../integrations/supabase/types';

function client(admin: boolean, token?: string) {
  const url = process.env['SUPABASE_URL'], key = process.env[admin ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Missing test configuration');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: randomUUID() }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (token) h.set('Authorization', `Bearer ${token}`); else if (key.startsWith('sb_')) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
}

const findings = [
  { key: 'reachable', status: 'pass', title: 'Page reachable', detail: 'Reached https://example.com with status 200 in 120 ms (measured).', why: 'Reachability matters.', fix: 'No action needed.' },
  { key: 'robots', status: 'attention', title: 'robots.txt and AI crawlers', detail: 'It blocks GPTBot.', why: 'robots.txt decides who can read your site.', fix: 'Remove the block.' },
];

async function fixture(run: (a: ReturnType<typeof client>, m: ReturnType<typeof client>, pid: string, other: string) => Promise<void>) {
  const minted = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, 'utf8'));
  const a = client(true), m = client(false, minted.session.access_token), ws = randomUUID(), outsider = randomUUID();
  const ids: string[] = [];
  try {
    expect((await a.from('workspaces').insert([{ id: ws, name: 'Temporary technical audit verification', max_products: 100 }, { id: outsider, name: 'Temporary isolated verification', max_products: 100 }])).error).toBeNull();
    expect((await a.from('members').insert({ workspace_id: ws, user_id: minted.session.user.id, role: 'member' })).error).toBeNull();
    const create = async (workspace: string) => { const id = randomUUID(); ids.push(id); expect((await a.from('products').insert({ id, workspace_id: workspace, name: 'Temporary technical audit fixture', description: 'Temporary test copy', url: 'example.com', stage: 'live' })).error).toBeNull(); return id; };
    await run(a, m, await create(ws), await create(outsider));
  } finally {
    for (const id of ids) expect((await a.from('products').delete().eq('id', id)).error).toBeNull();
    expect((await a.from('members').delete().eq('workspace_id', ws)).error).toBeNull();
    for (const id of [ws, outsider]) expect((await a.from('workspaces').delete().eq('id', id)).error).toBeNull();
  }
}

describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('technical audit database rules', () => {
  it('enforces ten audits per product per rolling hour', async () => { await fixture(async (a, _m, pid) => {
    for (let i = 0; i < 10; i++) expect((await a.rpc('reserve_technical_audit', { pid })).error).toBeNull();
    expect((await a.rpc('reserve_technical_audit', { pid })).error?.message).toBe('technical_audit_limit_reached');
  }); }, 30000);

  it('saves an audit and its findings atomically with counts', async () => { await fixture(async (a, m, pid) => {
    const saved = await a.rpc('save_technical_audit', { pid, page_url: 'https://example.com/', fetch_time: new Date().toISOString(), findings });
    expect(saved.error).toBeNull();
    const audit = (await m.from('technical_audits').select('*').eq('id', String(saved.data)).single()).data;
    expect(audit).toMatchObject({ fetched_url: 'https://example.com/', attention_count: 1, unknown_count: 0 });
    const rows = (await m.from('technical_audit_findings').select('*').eq('audit_id', String(saved.data)).order('position')).data;
    expect(rows?.map(r => r.check_key)).toEqual(['reachable', 'robots']);
    expect(rows?.[1]?.status).toBe('attention');
  }); }, 30000);

  it('isolates other accounts and denies client writes', async () => { await fixture(async (a, m, pid, other) => {
    expect((await a.rpc('save_technical_audit', { pid: other, page_url: 'https://example.com/', fetch_time: new Date().toISOString(), findings })).error).toBeNull();
    expect((await m.from('technical_audits').select('*').eq('product_id', other)).data).toEqual([]);
    expect((await m.from('technical_audit_findings').select('*').eq('product_id', other)).data).toEqual([]);
    expect((await m.from('technical_audits').insert({ product_id: pid, fetched_url: 'https://example.com/', fetched_at: new Date().toISOString() })).error?.code).toBe('42501');
    expect((await m.rpc('reserve_technical_audit', { pid })).error?.code).toBe('42501');
    expect((await m.rpc('save_technical_audit', { pid, page_url: 'https://example.com/', fetch_time: new Date().toISOString(), findings })).error?.code).toBe('42501');
  }); }, 30000);
});
