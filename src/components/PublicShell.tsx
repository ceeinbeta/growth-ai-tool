import { Link } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Menu, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CONTACT_EMAIL } from '@/lib/public-config';
import { Logo } from './Logo';
import { Button } from './ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';

function PublicAccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let mounted = true;
    const update = () => supabase.auth.getSession().then(({ data }) => { if (mounted) setSignedIn(!!data.session); });
    void update();
    window.addEventListener('focus', update);
    window.addEventListener('growloop:auth-changed', update);
    return () => { mounted = false; window.removeEventListener('focus', update); window.removeEventListener('growloop:auth-changed', update); };
  }, []);
  return <Button asChild variant="link" size="lg"><Link to={signedIn ? '/overview' : '/auth'}>{signedIn ? 'Open Brambly' : 'Sign in'}</Link></Button>;
}
function PublicLinks({ close, mobile = false }: { close?: () => void; mobile?: boolean }) {
  return <><Link to="/features" onClick={close} className="public-nav-link">Features</Link>{mobile && <Link to="/" hash="how-it-works" onClick={close} className="public-nav-link">How it works</Link>}<Link to="/" hash="faq" onClick={close} className="public-nav-link">FAQ</Link><Link to="/privacy" onClick={close} className="public-nav-link">Privacy</Link></>;
}
export function WaitlistLink({ children = 'Join the beta waitlist', onClick, variant = 'default' }: { children?: ReactNode; onClick?: () => void; variant?: 'default' | 'outline' }) {
  return <Button asChild variant={variant} size="lg" ><Link to="/" hash="waitlist" onClick={onClick}>{children}<ArrowRight /></Link></Button>;
}
export function PublicShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="public-site">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-[60] focus:bg-card focus:p-4 focus:text-foreground">Skip to content</a>
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <nav aria-label="Public" className="public-container flex items-center justify-between gap-6 py-3">
        <Link to="/" aria-label="Brambly home"><Logo /></Link>
        <div className="hidden items-center gap-6 lg:flex"><PublicLinks /></div>
        <div className="hidden items-center gap-6 lg:flex"><PublicAccountLink /><WaitlistLink variant="outline">Join the waitlist</WaitlistLink></div>
        <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation menu" className="lg:hidden"><Menu /></Button></SheetTrigger>
          <SheetContent className="public-site w-[min(90vw,360px)] motion-reduce:animate-none motion-reduce:transition-none"><SheetTitle className="text-left"><Logo /></SheetTitle><SheetDescription className="sr-only">Public navigation</SheetDescription><nav aria-label="Mobile public" className="mt-10 flex flex-col items-start gap-4"><PublicLinks mobile close={() => setOpen(false)} /><PublicAccountLink /><WaitlistLink onClick={() => setOpen(false)}>Join the waitlist</WaitlistLink></nav></SheetContent>
        </Sheet>
      </nav>
    </header>
    {children}
    <footer className="ink-field border-t"><div className="public-container py-12"><div className="flex flex-col justify-between gap-8 md:flex-row"><div><Link to="/" aria-label="Brambly home"><Logo tone="inverse" /></Link><p className="mt-4 text-sm text-muted-foreground">Untangle your growth.</p></div><nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2"><Link to="/features" className="public-nav-link">Features</Link><Link to="/privacy" className="public-nav-link">Privacy</Link><PublicAccountLink />{CONTACT_EMAIL && <a className="public-nav-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}</nav></div><div className="mt-10 flex items-center justify-between border-t pt-6 text-xs text-muted-foreground"><span>© 2026 Brambly</span><span className="rounded-sm bg-secondary px-2 py-1 font-semibold">Beta</span></div></div></footer>
  </div>;
}
