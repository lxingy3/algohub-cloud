# Codebase handoff

This is the starting point for anyone taking over AlgoHub. Work from the `_deploy_algohub_cloud` repository. The other Capstone folders are older copies, references, or local artifacts.

## First setup

```powershell
npm ci
npm run db:generate
npm run dev
```

Copy the values you need from `.env.example` into a local `.env`. Never commit the real database URL, service credentials, worker token, or OAuth secrets.

Before opening a pull request, run:

```powershell
npm run lint
npm run build
```

## How a request moves through the app

Most features follow the same path:

1. A page under `app/` renders the screen.
2. A route under `app/api/` validates the request and the current user.
3. Shared rules live under `lib/`.
4. Prisma reads or writes PostgreSQL using `prisma/schema.prisma`.

Keep shared rules in `lib/` when both a page and an API route need them. Keep database access in server files. Client components should call an API route instead of importing Prisma.

Every jurisdiction-scoped query uses `getJurisdictionId()` from `lib/jurisdiction.js`. The current deployment uses `JURISDICTION_ID=pittsburgh`.

## Feature map

| Area | Start here | Shared code | Prisma models | Smallest useful check |
| --- | --- | --- | --- | --- |
| App shell and navigation | `app/layout.js`, `app/page.js`, `app/components/SiteNav.js` | `app/globals.css`, `tailwind.config.js`, `lib/auth.js` | `Algorithm`, `Testimony`, `CommunityEvent`, `Organization`, `User` | `npm run build` |
| Static translations | `app/i18n/resources.js`, `app/components/I18nProvider.js` | `lib/translation.js` | None | `npm run lint:i18n` |
| Login, signup, and sessions | `app/login/page.js`, `app/signup/page.js`, `app/api/auth/` | `lib/auth.js`, `lib/nextauth.js`, `lib/password.js`, `lib/requestSecurity.js`, `lib/safeRedirect.js` | `User`, `Role`, `UserRole`, `Account`, `Session`, `PasswordResetToken`, `VerificationToken` | `npm run auth:safety:self-check` |
| Roles and admin access | `app/admin/layout.js`, `app/admin/users/` | `lib/roles.js`, `app/api/admin/roles/`, `app/api/admin/users/` | `User`, `Role`, `UserRole`, `Organization`, `Session`, `Account` | `npm run auth:lifecycle -- <test-base-url>` |
| Algorithm registry | `app/algorithms/`, `app/admin/algorithms/` | `app/api/algorithms/`, `app/api/admin/algorithms/`, `lib/searchRanking.js` | `Algorithm`, `AlgorithmClaim`, `AlgorithmDocument`, `TestimonyAlgorithmLink`, `Testimony` | `npm run query:performance:self-check` |
| Story list and detail | `app/stories/`, `app/my-stories/` | `app/api/testimonies/`, `lib/searchRanking.js`, `lib/storySummary.js` | `Testimony`, `TestimonyBrief`, `TestimonyAlgorithmLink`, `Comment`, `CommentLike`, `TestimonyReaction`, `User` | `npm run story:query:self-check` |
| Comments and reactions | `app/stories/[id]/` | `app/api/stories/[id]/comments/`, `app/api/stories/[id]/reactions/`, `lib/moderation.js` | `Comment`, `CommentLike`, `TestimonyReaction`, `Testimony`, `User` | `npm run auth:lifecycle -- <test-base-url>` |
| Story submission and drafts | `app/submit-testimony/page.js`, `app/components/SubmitTestimonyForm.js` | `app/api/testimonies/route.js`, `app/api/submission-draft/route.js` | `Testimony`, `TestimonyAlgorithmLink`, `SubmissionDraft`, `TranscriptionJob`, `User` | `npm run media:upload:self-check` |
| Media upload and playback | `app/api/uploads/presign/route.js`, media routes under stories, my-stories, and admin | `lib/mediaStorage.js`, `lib/clientMedia.js`, `lib/audioAccept.js` | `Testimony`, `SubmissionDraft`, `CommunityEvent` | `npm run media:upload:self-check` |
| Story moderation | `app/admin/testimonies/` | `app/api/admin/testimonies/`, `lib/moderation.js` | `Testimony`, `User` | `npm run auth:lifecycle -- <test-base-url>` |
| ML Quick Test | `app/admin/testimonies/MLQuickTest.js`, `app/api/ml/quick-test/route.js` | `lib/task1Transcription.js`, `lib/mlFullAnalysis.js`, `lib/mlAnalysisInput.js` | `Algorithm`, `Testimony` | `npm run ml:eval` for Tasks 2 through 5 |
| Stored ML refresh | `app/api/admin/testimonies/refresh-ml/route.js`, `app/api/transcription/process/route.js` | `lib/testimonyMlPersistence.js`, `lib/refreshMlScan.js`, `lib/algorithmMatcher.js` | `Testimony`, `TranscriptionJob`, `TestimonyAlgorithmLink`, `Algorithm` | `npm run ml:matcher:self-check` with the intended database configured |
| Python ML worker | `ml-worker-hf-space/app.py` | `ml-worker-hf-space/Dockerfile`, `ml-worker-hf-space/requirements.txt` | None | `npm run ml:worker:benchmark -- <audio-path> <output-json>` |
| Briefings explorer | `app/briefings/explore/page.js` | `app/api/explore/`, `lib/briefingsExplore.js`, `lib/semanticEmbeddings.js`, `lib/silenceAnalysis.js` | `Testimony`, `Algorithm`, `AlgorithmClaim`, `Briefing`, `CorpusTopic`, `SemanticEmbedding`, `CrossJurisdictionInsight`, `ThemeImprovementMap` | `npm run ml:briefings:verify -- <base-url>` |
| Briefing records and review | `app/briefings/[slug]/`, `app/admin/briefings/` | `app/api/briefings/`, `app/api/admin/briefings/`, `lib/briefingPartnerReview.js` | `Briefing`, `BriefingGenerationJob`, `BriefingReviewNote`, `BriefingPartnerReview`, `Algorithm`, `Organization`, `User` | `npm run briefings:partner:self-check` |
| Briefing batch jobs | `scripts/briefings-corpus-export.mjs`, `scripts/briefings-corpus-batch.py` | `scripts/briefings-corpus-apply.mjs`, `scripts/briefings-process-jobs.mjs` | `Testimony`, `CorpusTopic`, `SemanticEmbedding`, `BriefingGenerationJob` | `npm run ml:briefings:self-check` |
| Events and organizations | `app/events/`, `app/admin/events/`, `app/admin/organizations/` | `app/api/events/`, `app/api/admin/events/`, `app/api/organizations/`, `app/api/admin/organizations/` | `CommunityEvent`, `EventRegistration`, `Organization` | `node scripts/verify-ux-filters.mjs <base-url>` with admin credentials |
| Database schema and seed data | `prisma/schema.prisma`, `prisma/seed.js` | `prisma/migrations/`, `prisma/seed-data/` | All models | `npm run db:generate` |

## Common changes

### Change a database field

1. Edit `prisma/schema.prisma`.
2. Add a migration under `prisma/migrations/`. Do not edit an applied migration.
3. Update the API route that reads or writes the field.
4. Update the page or component that displays it.
5. Update seed data only if the field is needed by local demo records.
6. Run `npm run db:generate`, the closest self-check, and `npm run build`.

`database-map.md` lists the original table-to-screen relationships. Newer workflow models such as `TranscriptionJob`, `SubmissionDraft`, corpus records, event registrations, and Briefing review jobs are documented in `prisma/schema.prisma`.

### Change a public page

Start at its folder under `app/`. Follow its API calls into `app/api/`, then move shared filtering or validation into `lib/` only if more than one route uses it. Check both an empty result and a populated result when the page reads the database.

### Change login, roles, comments, or moderation

Read `lib/auth.js`, `lib/requestSecurity.js`, and `lib/moderation.js` before changing a route. These flows share session, same-origin, jurisdiction, and status-transition checks. Use the isolated test-database lifecycle script for writes. Never point a lifecycle script at production.

### Change media handling

The browser requests a signed upload policy from `app/api/uploads/presign/route.js`. `lib/mediaStorage.js` validates size and type, builds object keys, and signs upload and playback URLs. The database stores a `gcs://` reference rather than a public object URL. Keep the 200 MB app limit and the worker's separate 50 MB request limit in mind.

### Change the ML pipeline

Read `docs/ml-pipeline-documentation.md` first. The web app and formal refresh paths share `lib/mlFullAnalysis.js` and `lib/mlAnalysisInput.js`. The Python worker exposes transcription, impact, theme, entity, and keyword endpoints. When a worker endpoint is unavailable, the app can return an explicitly labeled degraded result for Tasks 2 through 5.

Do not label the current pipeline as a complete Task 1 through Task 7 implementation:

- Tasks 1 through 5 have model or worker paths.
- Task 6 is a reviewable top-one registry matcher, not the planned sentence-transformer service.
- Task 7 uses a local rule summary for new stories. The OpenAI summaries in the database came from a reviewed one-time batch, not an automatic service.

Any Task 6 or Task 7 replacement must keep model provenance, preserve human algorithm links, and stay off the live page request path.

### Change Briefings

The explorer screen is `app/briefings/explore/page.js`. Its data comes from the routes under `app/api/explore/`, which read approved stories and cached model fields. Heavy clustering and embedding work belongs in the scripts under `scripts/`, not in a page request.

The published Briefing record uses `app/briefings/[slug]/page.js`. Admin generation and review live under `app/admin/briefings/`. `lib/briefingPartnerReview.js` contains the publication gate and row-locking rules, so review decisions should not be reimplemented in a component.

## Data, hosting, and secrets

The live setup is:

- Vercel runs the Next.js app.
- Neon runs PostgreSQL.
- Google Cloud Storage is used only when the Firebase and service-account environment variables are configured.
- The Python model worker is self-hostable, but no Google Cloud deployment is recorded in this repository yet.

`.vercelignore` excludes the Python worker, model environments, and ML result folders. Vercel does not deploy that worker. The Vercel cron calls `GET /api/transcription/process`, which only lists pending work. A separate worker must poll the queue and post completion results.

The Google Cloud work requested in the August 7 meeting is a pipeline test. It does not require moving the website or Neon database. A worker-only test is the smaller and safer option.

Do not describe a storage choice as HIPAA compliant by itself. Compliance depends on the team's agreement with the provider, the services covered by that agreement, access controls, logging, retention, and the data placed in the system.

## Verification guide

Use the smallest check that covers the code you changed, then run lint and build before handoff.

| Change | Check |
| --- | --- |
| General JavaScript or page change | `npm run lint`, `npm run build` |
| Translation resources | `npm run lint:i18n` |
| Task 2 and Task 3 contract | `npm run ml:eval:contract` |
| Algorithm matching | `npm run ml:matcher:self-check` |
| Task 1 evaluator logic | `npm run ml:task1:evaluate -- --self-check` |
| Task 1 WER and CER | `npm run ml:task1:evaluate -- --input <approved-gold-json>` |
| Remote worker timing | `npm run ml:worker:benchmark -- <audio-path> <output-json>` |
| Briefings model-backed APIs | `npm run ml:briefings:verify -- <base-url>` |
| Briefing query state | `npm run briefings:query:self-check` |
| Partner review rules | `npm run briefings:partner:self-check` |
| Story query bounds | `npm run story:query:self-check` |
| Query count and transfer bounds | `npm run query:performance:self-check` |
| Upload validation | `npm run media:upload:self-check` |
| Auth request rules | `npm run auth:safety:self-check` |
| Full auth and moderation writes | `npm run auth:lifecycle -- <base-url>` with the test-database guard enabled |

## Known work still open

- Deploy the model worker to the approved Google Cloud test project and record the project ID, region, image digest, worker URL, and teardown steps.
- Run a cold and warm timing test with the agreed 30-minute audio file. Record upload time, transcription time, Tasks 2 through 5 time, total time, model names, machine type, and any fallback.
- Decide whether the meeting's Task 6 and Task 7 requirement means the full sentence-transformer and Llama 3.1/Ollama services. The current code does not provide those services.
- Obtain the housing-allocation and child-welfare claims and synthetic stories from the research lead before making an accuracy claim.

## Other documents

- `docs/ml-pipeline-documentation.md`: current ML behavior, storage, limits, and provenance
- `docs/requirements-traceability.md`: requirement status and deferred work
- `docs/algohub-build-spec-compliance.md`: comparison with the large build specification
- `database-map.md`: original database relationships and UI field map; use `prisma/schema.prisma` for newer workflow models
- `CLOUD_DEPLOYMENT.md`: current hosting and deployment notes
- `.env.example`: configuration names without real values
