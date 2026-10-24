# Slice 7 real-check fixes

- Read OpenAI answer text from raw message content and preserve citation hostnames.
- Record empty answers as failed, retaining their tokens and costs without reading them through AI.
- Show successful run counts for every engine in each check; distinguish no usable answers from no recommendations.
- Use the supplied measured OpenAI and Claude averages for cost estimates; retain Perplexity assumptions and estimate labels.
- Update 401/403 messages and default previously failed engines to unticked each time the confirmation opens, while allowing explicit retries and remembering product choices.
- Add mocked regression tests, run the full suite serially, and verify temporary-fixture cleanup. Do not call providers, change existing rows, or publish.

## Technical details
Keep existing provider models, endpoints, budgets, authorization, and scheduling unchanged. Legacy empty excerpts are treated as unusable when displaying results without updating stored records.