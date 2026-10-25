// Change only this origin, then run `bun run refresh:discovery`.
// Page canonical metadata continues to use the current request origin.
export const DISCOVERY_ORIGIN = 'https://growloop-mcads.lovable.app';
export const PUBLIC_DISCOVERY_PATHS = ['/', '/features', '/privacy'];
export const PRIVATE_CRAWLER_PATHS = ['/admin', '/ai-search-visibility', '/overview', '/settings', '/integrations', '/conversion-leaks', '/products', '/auth', '/api/'];

export function discoveryRobots() {
  return ['User-agent: *', 'Allow: /', ...PRIVATE_CRAWLER_PATHS.map(path => `Disallow: ${path}`), `Sitemap: ${DISCOVERY_ORIGIN}/sitemap.xml`, ''].join('\n');
}

export function discoverySitemap() {
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...PUBLIC_DISCOVERY_PATHS.map(path => `  <url><loc>${DISCOVERY_ORIGIN}${path}</loc></url>`), '</urlset>', ''].join('\n');
}