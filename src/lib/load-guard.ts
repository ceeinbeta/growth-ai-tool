// Runs before the app. If a page file fails to download (common after an update while the tab
// was open), reload once; if it still fails, or nothing renders, show a branded message
// instead of an empty screen.
export const LOAD_GUARD_SCRIPT = `(function(){
var K='gl-reload-once';var mem={};
function sg(k){try{return sessionStorage.getItem(k)}catch(_){return mem[k]||null}}function ss(k,v){try{sessionStorage.setItem(k,v)}catch(_){mem[k]=v}}function sr(k){try{sessionStorage.removeItem(k)}catch(_){delete mem[k]}}
function show(){if(document.getElementById('gl-load-error'))return;var d=document.createElement('div');d.id='gl-load-error';d.setAttribute('role','alert');
d.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--canvas);color:var(--ink);font-family:var(--font-sans),sans-serif;text-align:center';
d.innerHTML='<div style="max-width:420px"><p style="font-size:20px;font-weight:600;margin:0 0 8px">This page didn\\'t load</p><p style="font-size:15px;margin:0 0 16px">Part of Growloop could not be downloaded. Check your connection and try again.</p><button type="button" style="min-height:40px;padding:0 16px;border-radius:12px;border:0;background:var(--brand-bright);color:var(--ink);font:inherit;font-weight:600;cursor:pointer">Try again</button></div>';
d.querySelector('button').onclick=function(){sr(K);location.reload()};(document.body||document.documentElement).appendChild(d)}
function chunk(m){return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically/i.test(String(m||''))}
function handle(m){if(!chunk(m))return;if(!sg(K)){ss(K,'1');location.reload()}else show()}
addEventListener('vite:preloadError',function(e){e.preventDefault();handle('Failed to fetch dynamically imported module')});
addEventListener('error',function(e){handle(e&&e.message)});
addEventListener('unhandledrejection',function(e){handle(e&&e.reason&&(e.reason.message||e.reason))});
var origErr=console.error;console.error=function(){try{for(var i=0;i<arguments.length;i++){var a=arguments[i];handle(a&&a.message||a)}}catch(_){}return origErr.apply(console,arguments)};
addEventListener('load',function(){setTimeout(function(){sr(K);var r=document.body;if(r&&!r.innerText.trim())show()},8000)});
})();`;
