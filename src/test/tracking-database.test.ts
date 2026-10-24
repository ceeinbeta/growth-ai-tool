import { it, expect, describe } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';
describe.skipIf(process.env['PROFILE_INTEGRATION_TEST'] !== '1')('atomic tracking database limits', () => {
  it('enforces 60 per visitor, 5000 per product and 20 custom names', async () => {
    const url = process.env['SUPABASE_URL'], key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key) throw new Error('Missing test configuration');
    const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith('sb_')) h.delete('Authorization'); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
    const ws = await admin.from('workspaces').select('id').limit(1).single();
    if (!ws.data) throw new Error('Missing workspace');
    const product = await admin.from('products').insert({ workspace_id: ws.data.id, name: 'Tracking limit verification', url: 'verification.example.com', description: 'Temporary collection test', stage: 'prelaunch' }).select('id').single();
    if (!product.data) throw new Error(product.error?.message);
    const pid = product.data.id;
    const payload = { visitor_id: 'v'.repeat(36), name: 'pageview', path: '/verification' };
    try {
      const seed = await admin.from('events').insert(Array.from({ length: 60 }, () => ({ product_id: pid, ...payload })));
      expect(seed.error).toBeNull();
      expect((await admin.rpc('collect_tracking_event', { pid, payload })).data).toBe(false);
      const fresh = { ...payload, visitor_id: 'w'.repeat(36) };
      for (let i = 0; i < 20; i++) expect((await admin.rpc('collect_tracking_event', { pid, payload: { ...fresh, name: `custom_${i}` } })).data).toBe(true);
      expect((await admin.rpc('collect_tracking_event', { pid, payload: { ...fresh, name: 'custom_21' } })).data).toBe(false);
      expect((await admin.rpc('collect_tracking_event', { pid, payload: { ...fresh, name: 'custom_0' } })).data).toBe(true);
      for (let start = 0; start < 4919; start += 500) expect((await admin.from('events').insert(Array.from({ length: Math.min(500, 4919 - start) }, (_, i) => ({ product_id: pid, visitor_id: `visitor_${String(start + i).padStart(30, '0')}`, name: 'pageview', path: '/verification' })))).error).toBeNull();
      expect((await admin.rpc('collect_tracking_event', { pid, payload: { ...fresh, visitor_id: 'z'.repeat(36) } })).data).toBe(false);
    } finally { expect((await admin.from('products').delete().eq('id', pid)).error).toBeNull(); }
  }, 90000);
});