import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

export const getPublicOrigin = createServerFn({ method: 'GET' }).handler(() => {
  const request = getRequest();
  const url = new URL(request.url);
  // The sandbox proxy sanitizes this header; elsewhere only trust the URL.
  const forwarded = url.hostname === 'localhost' ? request.headers.get('x-forwarded-host') : null;
  return forwarded ? `https://${forwarded}` : url.origin;
});