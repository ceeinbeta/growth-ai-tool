import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const session = vi.hoisted(() => ({ current: null as null | object }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: session.current } }) } } }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a> }));

import { PublicShell } from '@/components/PublicShell';

describe('public front door account link', () => {
  it('shows Sign in linking to /auth for a signed-out visitor', async () => {
    session.current = null;
    render(<PublicShell><p>x</p></PublicShell>);
    const links = await screen.findAllByRole('link', { name: 'Sign in' });
    expect(links[0]?.getAttribute('href')).toBe('/auth');
    expect(screen.queryByText('Open Brambly')).toBeNull();
  });
  it('shows Open Brambly linking to /overview for a signed-in visitor', async () => {
    session.current = { access_token: 't' };
    render(<PublicShell><p>x</p></PublicShell>);
    const links = await screen.findAllByRole('link', { name: 'Open Brambly' });
    expect(links[0]?.getAttribute('href')).toBe('/overview');
  });
  it('shows the contact email as a mailto link', () => {
    session.current = null;
    render(<PublicShell><p>x</p></PublicShell>);
    expect(screen.getAllByRole('link', { name: 'hello@mcads.co' })[0]?.getAttribute('href')).toBe('mailto:hello@mcads.co');
  });
});
