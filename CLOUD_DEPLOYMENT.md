# Cloud Deployment Notes

The current production deployment uses two cloud services:

- Neon for the PostgreSQL database.
- Vercel for the Next.js website.

## Neon

1. Open Neon Console.
2. Go to `Projects`.
3. Click `Create project`.
4. Suggested project name: `algohub`.
5. Use the free plan.
6. Choose a region close to the team or the default region.
7. Create the project.
8. Open the connection details.
9. Copy the pooled PostgreSQL connection string.

Use the connection string as:

```env
DATABASE_URL="postgresql://..."
JURISDICTION_ID="pittsburgh"
```

## Initialize Database

After `DATABASE_URL` is available, run these commands from the `_deploy_algohub_cloud` repository:

```powershell
cd C:\Users\33672\Desktop\Capstone\_deploy_algohub_cloud
$env:DATABASE_URL="PASTE_NEON_POOLED_CONNECTION_STRING_HERE"
$env:JURISDICTION_ID="pittsburgh"
npm run db:deploy
npm run db:seed
```

The seed creates initial records for:

- jurisdictions and taxonomy
- algorithms and official claims
- testimonies
- comments, replies, likes, and reactions
- organizations
- users and roles
- community events
- briefings
- news updates

## Vercel

1. Open Vercel.
2. Click `Continue with GitHub`.
3. Import the AlgoHub repository.
4. Framework should be detected as Next.js.
5. Set Environment Variables:

```env
DATABASE_URL="same Neon pooled connection string"
JURISDICTION_ID="pittsburgh"
```

6. Build command:

```bash
npm run build
```

7. Deploy.

## After Deploy

Open the Vercel site and test:

1. Public algorithm registry.
2. Public stories/testimonies.
3. Events page.
4. Login with `admin@algostories.local`.
5. Admin dashboard.
6. Algorithm create/edit/delete.
7. Event create/edit/delete.
8. Testimony moderation.
9. Comment moderation.
10. User role management.

## Test Accounts

- `admin@algostories.local`
- `nora.admin@algostories.local`
- `facilitator@algostories.local`
- `maria.facilitator@algostories.local`
- `orgmember@algostories.local`
- `researcher@algostories.local`
- `community@algostories.local`
- `jamal.community@algostories.local`

Accounts with a stored password hash require that password. Legacy accounts without a hash can still use the passwordless compatibility path.

## Google Cloud ML test

The August 7 meeting asked for a Google Cloud performance test of the model pipeline. It did not require moving the Next.js site or the Neon database.

The smallest test deployment is the worker in `ml-worker-hf-space/`. Keep Vercel and Neon unchanged, deploy only the worker, then configure the worker endpoint environment variables from `.env.example` in the test deployment.

Before creating a paid resource, record the project ID, active billing account, budget alerts, region, quota, machine type, expected hourly cost, and teardown command. Do not claim a complete Task 1 through Task 7 result until the Task 6 sentence-transformer service and Task 7 Llama 3.1/Ollama service exist and run in the measured path.

After the worker is reachable, run the timed Task 1 through Task 5 check with the agreed audio file:

```powershell
$env:ML_WORKER_BASE_URL="https://WORKER_URL"
$env:ML_WORKER_TOKEN="LOCAL_SECRET_VALUE"
npm run ml:worker:benchmark -- "C:\path\to\30-minute-audio.mp3" "output\gcp-ml-worker-benchmark.json"
```

The report records timing and model metadata without copying the transcript into the JSON file. It marks Tasks 6 and 7 as unimplemented instead of counting the current matcher and rule summary as the requested models.
