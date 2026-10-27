import { readFileSync, writeFileSync } from 'node:fs';
// Artwork is immutable. Palette comes from the canonical theme; browser capture creates JPG.
const theme = readFileSync('src/design-system/theme.css', 'utf8');
const tokens = theme.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
if (!tokens) throw new Error('Missing Brambly theme');
const logo = readFileSync('src/assets/logos/brambly-logo-green.svg', 'utf8');
writeFileSync('/tmp/brand-render.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600&display=swap"><style>:root{${tokens}}*{box-sizing:border-box}body{margin:0}.social{width:1200px;height:630px;background:var(--canvas);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;color:var(--forest)}.social svg{width:640px;height:auto}.tagline{font:500 44px/48px Manrope,sans-serif;letter-spacing:-.02em;margin:0}</style></head><body><div class="social">${logo}<p class="tagline">Find your way to growth.</p></div></body></html>`);
