import { describe, expect, it } from 'vitest';
import { unusableEngineReason } from '@/lib/sov';
describe('safe engine failure explanations', () => {
  it('uses allowlisted key failure codes', () => { expect(unusableEngineReason([{ error: 'HTTP 403 — raw provider payload' }])).toBe('key rejected'); });
  it('explains empty answers', () => { expect(unusableEngineReason([{ error: 'empty answer — The engine returned no answer text.' }])).toBe('no usable answers'); });
  it('never displays unknown stored error content', () => { expect(unusableEngineReason([{ error: 'secret-token raw provider body' }])).toBe('the engine could not complete its runs'); });
});