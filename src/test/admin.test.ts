import { describe, expect, it } from 'vitest';
import { adminErrorMessage, inviteMessage, relativeTime, stageText } from '@/lib/admin';

describe('invite message', () => {
  const msg = inviteMessage('https://growloop-mcads.lovable.app', 'Founder@Example.com');

  it('points at the current origin sign-in page and names the invited email', () => {
    expect(msg.body).toContain('https://growloop-mcads.lovable.app/auth');
    expect(msg.body).toContain('Founder@Example.com');
    expect(msg.subject).toBe('Your Brambly beta seat');
  });

  it('uses the given origin without any hard-coded domain', () => {
    const other = inviteMessage('https://preview.example.dev', 'a@b.co');
    expect(other.body).toContain('https://preview.example.dev/auth');
    expect(other.body).not.toContain('lovable.app');
  });

  it('contains no email address other than the invited one', () => {
    const text = `${msg.subject}\n${msg.body}`;
    const emails = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
    expect(emails).toEqual(['Founder@Example.com']);
  });

  it('states that Brambly never sends anything and is signed by Cilene', () => {
    expect(msg.body).toContain('Brambly never posts or emails anything for you.');
    expect(msg.body.trim().endsWith('Cilene')).toBe(true);
  });
});

describe('admin error messages', () => {
  it('maps the seat limit with the current number', () => {
    expect(adminErrorMessage(new Error('beta_seat_limit_reached'), 20)).toBe('You have used all 20 beta seats. Raise the limit or remove someone first.');
  });
  it('maps account, admin, email and setting errors to plain copy', () => {
    expect(adminErrorMessage(new Error('already_has_account'))).toBe("This person already has an account, so they can't be removed.");
    expect(adminErrorMessage(new Error('cannot_remove_admin'))).toBe("This email belongs to the founder and can't be removed.");
    expect(adminErrorMessage(new Error('invalid_email'))).toBe('Enter a valid email address.');
    expect(adminErrorMessage(new Error('invalid_setting_value'))).toBe('That number is outside the allowed range.');
    expect(adminErrorMessage(new Error('forbidden'))).toBe('This page is only for the Brambly founder.');
    expect(adminErrorMessage(new Error('something_else'))).toBe('Something went wrong. Please try again.');
  });
});

describe('relative time', () => {
  it('formats minutes, hours and days', () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 30_000).toISOString())).toBe('just now');
    expect(relativeTime(new Date(now - 5 * 60_000).toISOString())).toBe('5 minutes ago');
    expect(relativeTime(new Date(now - 60 * 60_000).toISOString())).toBe('1 hour ago');
    expect(relativeTime(new Date(now - 3 * 3_600_000).toISOString())).toBe('3 hours ago');
    expect(relativeTime(new Date(now - 2 * 86_400_000).toISOString())).toBe('2 days ago');
  });
});

describe('stage text', () => {
  it('labels each stage in plain words', () => {
    expect(stageText('live')).toBe('Live product');
    expect(stageText('prelaunch')).toBe('Pre-launch');
    expect(stageText('idea')).toBe('Just an idea');
    expect(stageText(null)).toBe('—');
  });
});
