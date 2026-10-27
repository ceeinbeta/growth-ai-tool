import { BRAND_MARK_PATHS, BRAND_MARK_CIRCLES } from '@/lib/brand-mark';

type LogoProps = { className?: string; variant?: 'lockup' | 'mark-only'; tone?: 'default' | 'inverse' | 'ink'; size?: 'sm' | 'md' | 'lg' };
export function Logo({ className = '', variant = 'lockup', tone = 'default', size = 'md' }: LogoProps) {
  return <span className={`logo logo-${variant} logo-${tone} logo-${size} ${className}`} role="img" aria-label="Growloop">
    <svg viewBox="0 0 64 64" fill="none" className="logo-mark" aria-hidden="true">
      {BRAND_MARK_PATHS.map(d => <path key={d} d={d} className="logo-stroke" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />)}
      {BRAND_MARK_CIRCLES.map(c => <circle key={c.cx} {...c} className="logo-dot" />)}
    </svg>
    {variant === 'lockup' && <span className="logo-wordmark">growloop</span>}
  </span>;
}
