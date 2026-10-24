import { createFileRoute } from '@tanstack/react-router';
import { handleWaitlist } from '@/lib/waitlist-handler.server';

export const Route = createFileRoute('/api/public/waitlist')({
  server: { handlers: {
    POST: ({ request }) => handleWaitlist(request, async entry => {
      // Only reached after origin, body and consent validation. No emails sent.
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data, error } = await supabaseAdmin.rpc('submit_waitlist', { entry });
      if (error) throw new Error('Waitlist save failed');
      return data === true;
    }),
    OPTIONS: () => new Response(null, { status: 403 }),
  } },
});