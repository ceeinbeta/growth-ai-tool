import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let adminFlag = false;

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Outlet: () => null,
  useNavigate: () => () => {},
  useRouteContext: () => ({ user: { email: 'founder@example.com' } }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryKey: string[] }) => ({
    data: opts.queryKey[0] === 'is-app-admin' ? adminFlag : { workspace: null, products: [] },
  }),
  useQueryClient: () => ({ cancelQueries: vi.fn(), clear: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: vi.fn() } } }));

import { AppShell } from '@/components/AppShell';

describe('sidebar Admin link', () => {
  beforeEach(() => { adminFlag = false; });
  afterEach(cleanup);

  it('is hidden for non-admins', () => {
    render(<AppShell />);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('is shown for the founder', () => {
    adminFlag = true;
    render(<AppShell />);
    expect(screen.getByText('Admin')).toBeTruthy();
  });
});
