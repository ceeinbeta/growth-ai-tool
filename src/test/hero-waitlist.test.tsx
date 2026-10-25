import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a> }));
import { WaitlistForm } from '@/components/WaitlistForm';
import { WAITLIST_SUCCESS } from '@/lib/waitlist';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const fill = () => fireEvent.change(screen.getByLabelText('Email (required)'), { target: { value: 'a@example.com' } });

describe('hero waitlist pill', () => {
  it('requires consent before sending anything', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<WaitlistForm variant="hero" idPrefix="hero-waitlist" />);
    fill(); fireEvent.click(screen.getByRole('button', { name: /Join the beta waitlist/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('shows the server error in place', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Too many tries. Please wait a minute.' }) }));
    render(<WaitlistForm variant="hero" idPrefix="hero-waitlist" />);
    fill(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: /Join the beta waitlist/ }));
    expect(await screen.findByText('Too many tries. Please wait a minute.')).toBeInTheDocument();
  });
  it('shows the exact success message in place', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    render(<WaitlistForm variant="hero" idPrefix="hero-waitlist" />);
    fill(); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: /Join the beta waitlist/ }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(WAITLIST_SUCCESS));
  });
  it('shows website and stage only after the email field is focused', () => {
    render(<WaitlistForm variant="hero" idPrefix="hero-waitlist" />);
    expect(screen.queryByLabelText('Your website (optional)')).toBeNull();
    fireEvent.focus(screen.getByLabelText('Email (required)'));
    expect(screen.getByLabelText('Your website (optional)')).toBeInTheDocument();
  });
});

describe('homepage hero honesty', () => {
  const page = readFileSync('src/routes/index.tsx', 'utf8');
  it('has exactly one h1 and the pill links to features-today', () => {
    expect(page.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(page).toContain('href="#features-today"');
    expect(page).toContain('id="features-today"');
  });
  it('makes no rating, refund or guarantee claims', () => {
    expect(page).not.toMatch(/refund|guarantee|money.back|★|\bstars?\b|\brated\b|\d(\.\d)? ?\/ ?5\b|customer reviews/i);
  });
});
