import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const m = vi.hoisted(() => ({ run: vi.fn(), invalidate: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: () => m.run }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: m.invalidate }) }));
vi.mock('@/lib/audit-page.functions', () => ({ auditPage: {} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { PageAudit } from '@/components/PageAudit';
const props = { productId: 'fixture', website: 'publicsite.net', name: 'Fixture', days: 30 as const, audit: null, leaks: [] };
beforeEach(() => { vi.clearAllMocks(); m.invalidate.mockResolvedValue(undefined); });
describe('page audit founder flow', () => {
  it('submits the chosen path then reads back audit provenance and findings', async () => {
    m.run.mockResolvedValue({ ok: true });
    const view = render(<PageAudit {...props} />);
    fireEvent.change(screen.getByLabelText('Page to audit'), { target: { value: '/pricing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Audit this page' }));
    await waitFor(() => expect(m.run).toHaveBeenCalledWith({ data: { productId: 'fixture', path: '/pricing', days: 30 } }));
    await waitFor(() => expect(m.invalidate).toHaveBeenCalledWith({ queryKey: ['conversion', 'fixture'] }));
    view.rerender(<PageAudit {...props} audit={{ audited_url: 'https://publicsite.net/pricing', fetched_at: '2026-10-25T11:00:00Z' } as any} leaks={[{ id: 'leak', area: 'Headline', issue: 'Actual copy is unclear.', fix: 'Name the task.', rewrite: '', impact: 'high', status: 'open' } as any]} />);
    expect(screen.getByRole('link', { name: 'https://publicsite.net/pricing' })).toHaveAttribute('href', 'https://publicsite.net/pricing');
    expect(screen.getByText('Actual copy is unclear.')).toBeInTheDocument();
    expect(screen.getByLabelText('Status for Headline')).toHaveValue('open');
  });
  it('opens paste fallback after a thin page and submits only actual founder copy', async () => {
    m.run.mockResolvedValueOnce({ ok: false, fallback: true, error: 'We could only read 5 characters; this page may load its content with JavaScript.' }).mockResolvedValueOnce({ ok: true });
    render(<PageAudit {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Audit this page' }));
    await screen.findByLabelText('Headline');
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'My actual headline' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run audit' }));
    await waitFor(() => expect(m.run).toHaveBeenLastCalledWith({ data: { productId: 'fixture', days: 30, copy: { path: '', headline: 'My actual headline', subheadline: '', button: '', notes: '' } } }));
  });
});