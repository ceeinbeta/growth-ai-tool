export function publicHead(origin: string, path: string, title: string, description: string) {
  const url = new URL(path, origin).href;
  const image = new URL('/brand-social.jpg', origin).href;
  return {
    meta: [
      { title }, { name: 'description', content: description },
      { property: 'og:title', content: title }, { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' }, { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' }, { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Growloop — Find the leak. Fix it. Prove it worked.' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: image },
    ],
    links: [{ rel: 'canonical', href: url }],
  };
}