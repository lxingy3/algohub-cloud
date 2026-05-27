# AlgoHub

Next.js App Router implementation for AlgoHub.

## What is included

- Public pages for algorithms, testimonies, events, login, signup, and testimony submission.
- Admin dashboard pages for algorithm CRUD, event management, organization management, testimony moderation, comment moderation, and user role management.
- Prisma PostgreSQL schema for jurisdictions, taxonomy, algorithms, testimonies, users, roles, organizations, comments, reactions, events, briefings, and news updates.
- API routes for algorithms, admin workflows, auth/session handling, testimony submission, comments, comment likes, and story reactions.
- Seed data for the initial database.
- Visual ERD in `public/database-erd.svg` and UI/database field mapping in `database-map.md`.

## Cloud Architecture

Use both services:

- Neon hosts PostgreSQL.
- Vercel hosts the Next.js website.

## Required Environment Variables

Set these in Vercel and in any shell used to initialize the database:

```env
DATABASE_URL="Neon pooled PostgreSQL connection string"
JURISDICTION_ID="pittsburgh"
```

Do not commit the real `DATABASE_URL`.

## Initialize Neon

After creating the Neon project and copying the pooled connection string:

```bash
npm install
npm run db:deploy
npm run db:seed
```

The seed creates algorithms, testimonies, comments, replies, likes, reactions, organizations, users, roles, community events, briefings, and news updates.

## Deploy To Vercel

In Vercel:

1. Import the GitHub repository.
2. Set `DATABASE_URL` and `JURISDICTION_ID` in Environment Variables.
3. Keep the build command as:

```bash
npm run build
```

The build script runs `prisma generate` before `next build`.

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

## Useful Commands

```bash
npm run build
npm run lint
npm run db:generate
npm run db:deploy
npm run db:seed
```
