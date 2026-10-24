import { WAITLIST_CONSENT, WAITLIST_LIMIT, WAITLIST_MAX_BYTES, WAITLIST_SUCCESS, isSameOrigin, waitlistInputSchema, type WaitlistEntry } from './waitlist';

type SaveEntry = (entry: WaitlistEntry) => Promise<boolean>;
export async function handleWaitlist(request: Request, save: SaveEntry): Promise<Response> {
  const json = (message: string, status = 200) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!isSameOrigin(request)) return json('This form must be submitted from Growloop.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json('Please send the waitlist form again.', 415);
  if (Number(request.headers.get('content-length')) > WAITLIST_MAX_BYTES) return json('Keep your submission under 2 KB.', 413);
  let raw = '';
  const reader = request.body?.getReader();
  if (!reader) return json('Please fill in the waitlist form.', 400);
  const decoder = new TextDecoder();
  try {
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > WAITLIST_MAX_BYTES) { await reader.cancel(); return json('Keep your submission under 2 KB.', 413); }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
    const input: unknown = JSON.parse(raw);
    if (input && typeof input === 'object' && 'company' in input && typeof input.company === 'string' && input.company.trim()) return json(WAITLIST_SUCCESS);
    const parsed = waitlistInputSchema.safeParse(input);
    if (!parsed.success) return json(parsed.error.issues[0]?.message ?? 'Please check your details.', 400);
    const entry = parsed.data;
    const accepted = await save({ email: entry.email, website: entry.website, stage: entry.stage ?? null, utm_source: entry.utm_source ?? null, utm_medium: entry.utm_medium ?? null, utm_campaign: entry.utm_campaign ?? null, consent_text: WAITLIST_CONSENT });
    return json(accepted ? WAITLIST_SUCCESS : WAITLIST_LIMIT, accepted ? 200 : 429);
  } catch {
    return json('We couldn’t save your details. Please try again.', 400);
  } finally { reader.releaseLock(); }
}