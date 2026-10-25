import { writeFileSync } from 'node:fs';
import { discoveryRobots, discoverySitemap } from '../src/lib/public-discovery';

writeFileSync('public/robots.txt', discoveryRobots());
writeFileSync('public/sitemap.xml', discoverySitemap());