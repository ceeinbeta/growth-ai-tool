import { forwardRef, type HTMLAttributes } from 'react';
import greenLogo from '../assets/logos/brambly-logo-green.svg';
import whiteLogo from '../assets/logos/brambly-logo-white.svg';
import symbol from '../assets/logos/brambly-symbol.svg';
import { cn } from './utils';
export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'lockup' | 'symbol';
  tone?: 'default' | 'inverse';
  size?: 'sm' | 'md' | 'lg';
}
/** Immutable supplied artwork. Inverse symbol falls back to the supplied white lockup. */
export const Logo = forwardRef<HTMLSpanElement, LogoProps>(function Logo({ className, variant = 'lockup', tone = 'default', size = 'md', ...props }, ref) {
  const src = tone === 'inverse' ? whiteLogo : variant === 'symbol' ? symbol : greenLogo;
  return <span ref={ref} className={cn('logo', `logo-${variant}`, `logo-${tone}`, `logo-${size}`, className)} {...props}><img className="logo-image" src={src} alt="Brambly" /></span>;
});
