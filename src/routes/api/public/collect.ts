import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/public/collect')({ server: { handlers: {
  POST: async ({ request }) => (await import('@/lib/collect-handler.server')).collect(request),
  OPTIONS: async () => (await import('@/lib/collect-handler.server')).emptyCollect(),
} } });