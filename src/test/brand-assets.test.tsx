import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render,screen } from '@testing-library/react';
import { Logo } from '@/components/Logo';
import { publicHead } from '@/lib/public-head';
import { landingJsonLd } from '@/lib/public-faq';
import greenLogo from '@/assets/logos/brambly-logo-green.svg';
import whiteLogo from '@/assets/logos/brambly-logo-white.svg';
import symbol from '@/assets/logos/brambly-symbol.svg';
describe('Brambly supplied assets',()=>{
 it('selects immutable supplied logos and the white lockup on dark grounds',()=>{
  for(const [variant,tone,file] of [['lockup','default',greenLogo],['symbol','default',symbol],['lockup','inverse',whiteLogo],['symbol','inverse',whiteLogo]] as const){const {unmount}=render(<Logo variant={variant} tone={tone}/>);expect(screen.getByAltText('Brambly').getAttribute('src')).toBe(file);unmount();}
  expect(readFileSync('public/favicon.svg','utf8')).toContain('M11 7h25c13 0 21 5 21 13');
 });
 it('keeps social images leaf-only and Organization logo linked',()=>{
  for(const path of ['/','/features','/privacy']){const m=publicHead('https://growloop-mcads.lovable.app',path,'Brambly','Brambly').meta;expect(m.find(m=>m.property==='og:image')?.content).toBe('https://growloop-mcads.lovable.app/brand-social.jpg');expect(m.find(m=>m.name==='twitter:image')?.content).toBe('https://growloop-mcads.lovable.app/brand-social.jpg');}
  expect(readFileSync('src/routes/__root.tsx','utf8')).not.toMatch(/og:image|twitter:image/);
  expect(JSON.parse(landingJsonLd('https://growloop-mcads.lovable.app'))['@graph'][0].name).toBe('Brambly');
 });
});
