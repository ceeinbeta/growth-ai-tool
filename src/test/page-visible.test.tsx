import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({ options: opts }),
  redirect: (x: unknown) => x,
  Link: ({ to, hash, children, activeProps: _a, activeOptions: _o, ...rest }: any) => <a href={hash ? `${to}#${hash}` : to} {...rest} onClick={(e) => { e.preventDefault(); rest.onClick?.(e); }}>{children}</a>,
  Outlet: () => null, useNavigate: () => () => {}, useRouteContext: () => ({ user: { email: 'x' } }),
}));

import { Route as AuthRoute } from '@/routes/auth';
import { PageLoading } from '@/components/PageLoading';
import { SidebarNav } from '@/components/AppShell';
import { focusHashTarget } from '@/lib/hash-focus';
import { pickNextStep } from '@/lib/next-step';

describe('pages never render blank', () => {
  it('/auth shows the sign-in form text', () => {
    const Page = (AuthRoute as any).options.component;
    render(<Page />);
    expect(screen.getByRole('button', { name: /email me a sign-in link/i })).toBeTruthy();
    expect(screen.getByText(/one-time link/i)).toBeTruthy();
  });
  it('/auth and signed-in pages have a visible loading fallback', () => {
    expect((AuthRoute as any).options.pendingComponent).toBe(PageLoading);
    render(<PageLoading />);
    expect(screen.getByRole('status').textContent).toContain('Loading');
  });
});

describe('section links scroll and focus', () => {
  it('focusHashTarget waits for a section that renders later', async () => {
    vi.useFakeTimers();
    const p = focusHashTarget('#late');
    const el = document.createElement('div'); el.id = 'late';
    setTimeout(() => document.body.appendChild(el), 200);
    await vi.advanceTimersByTimeAsync(300);
    expect(await p).toBe(true);
    expect(document.activeElement).toBe(el);
    expect(el.getAttribute('tabindex')).toBe('-1');
    vi.useRealTimers(); el.remove();
  });
  for (const [label, id] of [['Website tracking', 'tracking'], ['Product profile', 'profile']] as const) {
    it(`sidebar "${label}" moves focus to #${id}`, async () => {
      render(<><SidebarNav isAdmin={false} /><section id={id}>target</section></>);
      await act(async () => { fireEvent.click(screen.getByRole('link', { name: label })); await new Promise(r => setTimeout(r, 30)); });
      expect((document.activeElement as HTMLElement).id).toBe(id);
    });
  }
  it('sidebar Integrations is a real link to /integrations', () => {
    render(<SidebarNav isAdmin={false} />);
    const a = screen.getAllByRole('link', { name: 'Integrations' })[0]!;
    expect(a.getAttribute('href')).toBe('/integrations');
    expect(a.closest('[aria-disabled="true"]')).toBeNull();
  });
  it('Overview "Install tracking" step targets the tracking section', () => {
    const step = pickNextStep({ profiled: true, profileReviewed: true, eventCount: 0, funnelSteps: 0, hasAudit: false, hasTechnicalAudit: false, usableVisibilityRuns: 0, leaksInProgressOrDone: 0 } as any);
    expect(step.action).toBe('Install tracking');
    expect(step.to).toBe('/integrations#tracking');
  });
});
