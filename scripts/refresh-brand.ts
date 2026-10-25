import { readFileSync, writeFileSync } from 'node:fs';
import { brandMarkSvg } from '../src/lib/brand-mark';

// Shared theme is the only authored source of palette values, including asset colors.
const theme = readFileSync('src/styles.css', 'utf8');
const tokens = theme.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
if (!tokens) throw new Error('Missing shared brand theme');
const mark = brandMarkSvg();
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>:root{${tokens}}</style><rect width="64" height="64" rx="16" fill="var(--paper)"/>${mark.replace('<svg ', '<svg x="4" y="4" width="56" height="56" ')}</svg>`;
writeFileSync('public/favicon.svg', favicon);
writeFileSync('/tmp/brand-render.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"><style>:root{${tokens}}*{box-sizing:border-box}body{margin:0;font-family:'DM Sans',sans-serif}.social{width:1200px;height:630px;background:var(--canvas);display:flex;flex-direction:column;justify-content:center;padding:100px;color:var(--ink)}.lockup{display:flex;align-items:center;gap:.3em;font-size:112px;font-weight:500;line-height:1.2}.lockup svg{width:.82em;height:.82em}.wordmark{letter-spacing:-.065em}.tagline{font-size:40px;font-weight:500;margin:38px 0 0;letter-spacing:-.04em}.icon{width:180px;height:180px;background:var(--paper);border-radius:45px;padding:12px}.icon svg{width:100%;height:100%}</style></head><body><div class="social"><div class="lockup">${mark}<span class="wordmark">growloop</span></div><p class="tagline">Find the leak. Fix it. Prove it worked.</p></div><div class="icon">${mark}</div></body></html>`);