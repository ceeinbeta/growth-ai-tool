import { liveFeatures, upcomingFeatures } from './public-features';
import { CONTACT_EMAIL } from './public-config';

// Change only this origin, then run `bun run refresh:discovery`.
// Page canonical metadata continues to use the current request origin.
export const DISCOVERY_ORIGIN = 'https://growloop-mcads.lovable.app';
export const PUBLIC_DISCOVERY_PATHS = ['/', '/features', '/privacy'];
export const DISCOVERY_LAST_UPDATED = '2026-10-25';
export const PRIVATE_CRAWLER_PATHS = ['/admin', '/ai-search-visibility', '/overview', '/settings', '/integrations', '/conversion-leaks', '/technical-audit', '/products', '/auth', '/api/'];

export function discoveryRobots() {
  return ['User-agent: *', 'Allow: /', ...PRIVATE_CRAWLER_PATHS.map(path => `Disallow: ${path}`), `Sitemap: ${DISCOVERY_ORIGIN}/sitemap.xml`, ''].join('\n');
}

export function discoverySitemap() {
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...PUBLIC_DISCOVERY_PATHS.map(path => `  <url><loc>${DISCOVERY_ORIGIN}${path}</loc></url>`), '</urlset>', ''].join('\n');
}

export function discoveryLlms() {
  const pageNames = ['Home', 'Features', 'Privacy'];
  const pageDescriptions = ['What Growloop is and how it works.', 'What is live today and what is coming soon.', 'What data is collected and how to ask for deletion.'];
  return [
    '# Growloop', '',
    '> Growloop is a growth app for solo founders that finds why your product is not growing, helps you fix it, and measures what happens next.', '',
    'Growloop is in invite-only beta and is free while in beta. It never posts, sends or publishes anything for you. Numbers are labeled measured, estimated, benchmark or sample, and AI-written content is labeled.', '',
    `Last updated: ${DISCOVERY_LAST_UPDATED}`, '',
    'AI search visibility is built to check ChatGPT, Perplexity and Claude; engines are connected one by one during the beta, so some may show as not connected.', '',
    '## Live today', '',
    ...liveFeatures.map(f => `- [${f.name}](${DISCOVERY_ORIGIN}/features#${f.id}): ${f.promise}`), '',
    '## Soon', '',
    ...upcomingFeatures.map(f => `- [${f.name}](${DISCOVERY_ORIGIN}/features#coming-next): Soon, not available yet. ${f.promise}`), '',
    '## Pages', '',
    ...PUBLIC_DISCOVERY_PATHS.map((path, i) => `- [${pageNames[i]}](${DISCOVERY_ORIGIN}${path}): ${pageDescriptions[i]}`), '',
    '## Contact', '',
    `- [Email](mailto:${CONTACT_EMAIL}): Contact Growloop.`, '',
  ].join('\n');
}