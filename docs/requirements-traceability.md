# AlgoHub requirements traceability

Priority order: current weekly assignments and meeting decisions, then `AlgoHub_Build_Specification.md`, then older implementation assumptions.

| Requirement | Source | Implementation | Verification | Status |
| --- | --- | --- | --- | --- |
| Next.js, Neon, Prisma, jurisdiction-scoped schema | Week 3 | App Router, Prisma migrations, Neon production DB | `npm run build`; backend boundary checks | Complete |
| ERD and UI/database field mapping | Week 3 | `public/database-erd.svg`, `database-map.md` | File review | Complete |
| Community auth, reactions, comments, moderation | Week 3 | Public and admin routes | Authenticated lifecycle regression still required before release | Implemented, regression pending |
| Audio/video transcription | Weeks 6-7 | FastAPI/Docker worker; video audio track only | Production worker samples; `npm run ml:task1:evaluate` | Implemented; WER/CER evaluator added, independent gold transcripts pending |
| Task 2 impact classification | Week 7 | BART raw scores + shared evidence resolver; explicitly labeled degraded fallback | `npm run ml:eval`; `npm run ml:eval:contract` | 71-row internal contract check only; independent labels pending |
| Task 3 multi-label themes | Week 7 | BART scores + matched-evidence gate; explicitly labeled degraded fallback | `npm run ml:eval`; `npm run ml:eval:contract` | 170/170 required-theme assertions on internal fixtures; independent labels pending |
| Task 4 entities and Task 5 keywords | Week 7 | spaCy and KeyBERT | Stored coverage plus fixtures; optional gold entity/keyword scoring | Gold labels pending; evaluator reports no metric rather than inferring one |
| Downstream algorithm linking subset | July 14 user direction; older Task 6 design | Shared analysis input + versioned Task 4/5/registry scorer; formal persistence and Quick Test preview | `npm run ml:matcher:self-check`; 62-row DB backfill audit | Re-opened as suggested top-1 match; full embedding linker still deferred |
| Summary generation | July 14 user direction; older Task 7 design | User-authorized OpenAI Codex one-time batch for approved, publicly shareable stories, explicit `TestimonyBrief` provenance; local fallback for new stories | DB provenance/count check | Batch implemented; public-posting permission is not represented as separate LLM-processing consent, and automatic LLM processing remains disabled |
| Six Briefing views and 52 numbered blocks | Week 9 | `/briefings` community/library/government, overview/algorithm | Playwright route and block-count check | Complete |
| Corpus embeddings, UMAP, HDBSCAN, BERTopic, KeyBERT | Week 9 | Offline batch and cached DB fields | Corpus evaluation and API verification | Implemented; quality tuning required |
| Suggested/interpretive labels and privacy gating | Week 9 | Suggested labels; government aggregate-only APIs | `npm run ml:briefings:verify` | Complete |
| Reading level, language, progressive disclosure | Week 9 build spec | Plain, standard, and detailed URL state; English/original language mode; Expand | Browser and build review | Implemented |
| Drill-through from every aggregate | Week 9 build spec | Evidence drawer and drilldown modal, including impact and claim members | Production Playwright count/member checks | Complete for the audited Week 9 views |
| Optional LLM wording and briefing prose | Week 9 build spec; optional in meeting | Local draft first; optional provider polish; every output remains a draft | Queue fallback and reviewer fields | Implemented; provider access is optional |
| Admin generate, review, publish | Big spec Phase 5 | Persistent offline queue, worker status, review and publish UI | Queue integration and database status | Implemented |
| PDF/print Briefing | Big spec Phase 5 | Single reviewed-Briefing export is not present | Route/UI review | Incomplete; do not print the six-view explorer as a substitute |
| Partner review | Big spec Phase 5 | Role-limited draft review page, notes, and admin display | Auth boundary and build | Implemented |
| Peer-jurisdiction benchmark | Week 9 | Approved-only endpoint | Live API | Waiting for approved peer data |
| Google Cloud scheduled worker | Week 9 meeting | Local reproducible queue worker with a persistent job contract | Manual worker run | Migration-ready; hosted worker expected later with Aziz |
| Facilitator/partner dashboards and fine-tuning | Big spec Phase 6 | Roles exist | Route review | Future phase |

Release claims must distinguish internal/synthetic checks from research-team-approved evaluation data.

## Current evaluation decision

The July 12 `clusterText` experiment was rejected: cross-cutting pairwise F1 rose from 0.23 to 0.33, but domain pairwise F1 fell from 0.73 to 0.45. Production remains on the earlier full-text Qwen run. The batch CLI keeps the alternate input behind `--cluster-text-mode experience` for reproducibility; `full` is the default.
