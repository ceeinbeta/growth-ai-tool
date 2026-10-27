import themeSource from '../design-system/theme.css?raw';
import greenLogo from '../assets/logos/brambly-logo-green.svg';

export function renderErrorPage(): string {
  const tokens = themeSource.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" />
    <style>
      :root { ${tokens} }
      body { font: 16px/1.625 'DM Sans', sans-serif; background: var(--canvas); color: var(--ink); display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .logo { display:flex; align-items:center; justify-content:center; gap:.3em; font-size:27px; font-weight:500; margin-bottom:1.5rem; }
      .logo svg { width:.82em; height:.82em; } .wordmark { letter-spacing:-.065em; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: var(--muted-strong); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 12px; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid var(--ink); }
      .primary { background: var(--forest); color: var(--white); }
      .secondary { background: transparent; color: var(--ink); }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo" role="img" aria-label="Brambly"><img src="${greenLogo}" alt="Brambly" style="width:180px;height:auto"/></div>
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
