import { Link } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CONTACT_EMAIL } from '@/lib/public-config';
import { Logo } from './Logo';
import { Button } from './ui/button';

function PublicAccountLink({ footer = false }: { footer?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let mounted = true;
    const update = () => supabase.auth.getSession().then(({ data }) => { if (mounted) setSignedIn(!!data.session); });
    void update();
    // Root owns the single auth listener and announces identity transitions.
    window.addEventListener('focus', update);
    window.addEventListener('growloop:auth-changed', update);
    return () => { mounted = false; window.removeEventListener('focus', update); window.removeEventListener('growloop:auth-changed', update); };
  }, []);
  return <Button asChild variant={footer ? 'link' : 'outline'}><Link to={signedIn ? '/overview' : '/auth'}>{signedIn ? 'Open Growloop' : 'Sign in'}</Link></Button>;
}

export function PublicShell({ children }: { children: ReactNode }) {
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4 focus:text-primary">Skip to content</a>
    <header className="border-b bg-card">
      <nav aria-label="Public" className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" aria-label="Growloop home"><Logo /></Link><PublicAccountLink />
      </nav>
    </header>
    {children}
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-8 md:px-10">
        <Link to="/" aria-label="Growloop home"><Logo /></Link>
        <div className="flex flex-wrap items-center gap-5"><Link to="/privacy" className="text-sm text-primary underline-offset-4 hover:underline">Privacy</Link><PublicAccountLink footer />{CONTACT_EMAIL && <a className="text-sm text-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}</div>
      </div>
    </footer>
  </>;
}