import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }));
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, hash, children, ...rest }: any) => <a href={`${to}${hash ? `#${hash}` : ''}`} {...rest}>{children}</a> }));
import { PublicShell } from '@/components/PublicShell';

describe('public navigation destinations', () => {
  it('links home sections from another public page', () => {
    render(<PublicShell><main>Features page</main></PublicShell>);
    expect(screen.getByRole('link', { name: 'FAQ' }).getAttribute('href')).toBe('/#faq');
    expect(screen.getByRole('link', { name: 'Join the waitlist' }).getAttribute('href')).toBe('/#waitlist');
    expect(screen.getAllByRole('link', { name: 'Features' })[0]?.getAttribute('href')).toBe('/features');
  });
  it('opens a labeled mobile dialog and closes it when a destination is selected', async () => {
    render(<PublicShell><main>Privacy page</main></PublicShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const mobile = screen.getByRole('navigation', { name: 'Mobile public' });
    expect(mobile.querySelector('a[href="/#how-it-works"]')).not.toBeNull();
    const featureLink = mobile.querySelector('a[href="/features"]');
    expect(featureLink).not.toBeNull();
    if (!featureLink) throw new Error('Features destination missing');
    fireEvent.click(featureLink);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
