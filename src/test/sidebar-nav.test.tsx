import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, hash, children, activeProps: _a, activeOptions: _o, ...rest }: any) => <a href={hash ? `${to}#${hash}` : to} {...rest}>{children}</a>,
  Outlet: () => null, useNavigate: () => () => {}, useRouteContext: () => ({ user: { email: 'x' } }),
}));

import { SidebarNav } from '@/components/AppShell';
import { NAV_GROUPS } from '@/lib/nav';
import { COMING_INTEGRATIONS } from '@/lib/integrations';

describe('sidebar navigation', () => {
  it('lists groups in the agreed order', () => {
    expect(NAV_GROUPS.map(g => g.label.toUpperCase())).toEqual(['HOME', 'GROWTH AUDIT', 'DISTRIBUTION', 'ANALYTICS', 'FOUNDATION']);
  });
  it('renders Soon items as disabled text, not links', () => {
    render(<SidebarNav isAdmin={false} />);
    for (const label of ['Google search growth', 'Listing optimization', 'Finding conversations', 'Results', 'Competitor gaps', 'Experiments']) {
      const el = screen.getByText(label).closest('[aria-disabled="true"]');
      expect(el).not.toBeNull();
      expect(screen.getByText(label).closest('a')).toBeNull();
    }
  });
  it('keeps existing routes as links', () => {
    render(<SidebarNav isAdmin={false} />);
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('href')).toBe('/overview');
    expect(screen.getByRole('link', { name: 'Conversion leaks' }).getAttribute('href')).toBe('/conversion-leaks');
    expect(screen.getByRole('link', { name: 'Technical audit' }).getAttribute('href')).toBe('/technical-audit');
    expect(screen.getByRole('link', { name: 'AI search visibility' }).getAttribute('href')).toBe('/ai-search-visibility');
    expect(screen.getByRole('link', { name: 'Product profile' }).getAttribute('href')).toBe('/overview#profile');
    expect(screen.getByRole('link', { name: 'Website tracking' }).getAttribute('href')).toBe('/integrations#tracking');
  });
  it('uses shared single-line sidebar roles with the exact Soon pill', () => {
    const { container } = render(<SidebarNav isAdmin />);
    const rows = container.querySelectorAll('.nav-item');
    expect(rows.length).toBeGreaterThan(10);
    rows.forEach((r) => {
      expect(r.className).not.toMatch(/whitespace-normal|break-words|text-wrap|py-\d|text-(sm|xs|base)/);
      expect(r.querySelector('.nav-item-label')).not.toBeNull();
    });
    const pills = container.querySelectorAll('.nav-soon-pill');
    expect(pills.length).toBe(6);
    pills.forEach((p) => expect(p.textContent).toBe('Soon'));
  });
  it('defines sidebar sizes on the shared scale', async () => {
    const css = (await import('node:fs')).readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('--sidebar-w: 248px');
    expect(css).toContain('--text-nav-label: 11px');
    expect(css).toContain('--text-pill: 10.5px');
    expect(css).toMatch(/\.nav-item \{[^}]*height: 36px[^}]*white-space: nowrap/);
    expect(css).toMatch(/\.nav-soon-pill \{[^}]*white-space: nowrap/);
    expect(css).toMatch(/\.product-switcher \{ height: 56px/);
  });
  it('shows Admin only to founders', () => {
    const { unmount } = render(<SidebarNav isAdmin={false} />);
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    unmount();
    render(<SidebarNav isAdmin />);
    expect(screen.getByRole('link', { name: 'Admin' }).getAttribute('href')).toBe('/admin');
  });
  it('lists the Soon integrations in the promised order', () => {
    expect(COMING_INTEGRATIONS.map(i => i.name)).toEqual([
      'Google Search Console', 'Google Analytics', 'PostHog', 'Stripe',
      'Bing Webmaster Tools', 'Slack', 'Notion / CSV export',
    ]);
  });
});
