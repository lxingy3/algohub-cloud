# Legacy LLM briefing audit

Audit date: 2026-07-13

## Scope

The only external narrative-generation call in repository history was the offline briefing rewrite in `scripts/briefings-narrative-draft.mjs`. It sent a complete locally generated briefing draft to the Anthropic Messages API and allowed the response to replace six fields: executive summary, key findings, pattern analysis, silence gaps, recommendations, and claim-vs-experience. The job worker could opt into that path; public page loads did not call the API.

The audit compared the 17-draft pre-rewrite snapshot in `task-briefings-results/briefing-local-before-claude-apply.json` with `task-briefings-results/briefing-claude-full-apply.json`, then checked the current production `/api/briefings` response.

## Findings

- All 17 rewritten drafts preserved the title, slug, briefing type, target algorithm, date range, and testimony count from the pre-rewrite snapshot.
- The narrative summaries preserved the snapshot's core story counts, leading themes, and represented domains. Their uncertainty language was generally appropriate for the small, non-representative samples.
- All 17 drafts added silence-gap prose even though the source snapshot contained no silence-gap rows. These additions are cautions or suggestions, not measured findings, so they are not suitable as structured evidence.
- The source snapshot contained 16 structured claim-vs-experience rows. Two rewritten rows changed the schema from `claims` and `experienceCount` to `statedPurpose` and `relatedExperienceCount`; four others paraphrased stored claim text that should remain verbatim.
- The cross-cutting source had no claim-vs-experience rows, but the rewrite added three free-text rows. Those rows describe review limitations rather than an actual claim comparison.
- The archived rewrite used 33 stories through 2026-06-15. Current production uses 49 stories through 2026-07-05. Of the 17 old drafts, only four still have the same story count, nine have changed counts, and four are no longer published.

## Decision

Keep the old JSON only as historical audit evidence. Do not republish it or use its silence-gap and claim-vs-experience fields. Current production briefings remain the newer deterministic `staff_draft` versions, and the live claim-vs-experience route uses stored claims plus approved stories and open-source embeddings.

No replacement is labelled `ChatGPT/Codex generated` because no new ChatGPT/Codex prose was published during this audit. If such content is approved and generated later, use the explicit `chatgpt_codex_generated` provenance value; do not relabel deterministic or staff-authored content.
