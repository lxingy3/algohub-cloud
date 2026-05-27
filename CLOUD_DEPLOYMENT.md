# Cloud Deployment Notes

This project needs two cloud services:

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

After `DATABASE_URL` is available:

```powershell
cd C:\Users\33672\Desktop\Capstone\Algo-Hub-main
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

The current login flow uses email-only accounts for access checks.
