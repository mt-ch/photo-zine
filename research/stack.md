# Stack: database, file storage and admin login on free tiers

Research for issue #2 (map: #1). Checked against official docs and pricing pages on 2026-09-24. Next.js facts come from the bundled Next.js 16.3.6 docs in `node_modules/next/dist/docs/`.

## Recommendation

**Neon Postgres (via the Vercel Marketplace) + Vercel Blob (one private store and one public store) + Better Auth (email/password, sign-up disabled).**

- Uploads go straight from the browser into a **private** Blob store. Only the admin can read them, through an authenticated route handler.
- When the admin publishes a zine, each selected photo is copied server-side (`get` from the private store, `put` into the **public** store). The public URL is saved on the photo row. Photos that aren't selected never become public.
- Relational data (issues, submissions, photos, selection order) lives in Neon Postgres, which is plain Postgres and easy to move.
- A single admin user is created once (by a seed script). Public sign-up is turned off with `emailAndPassword.disableSignUp: true`.

Main reasons:

1. **Nothing pauses.** Neon scales to zero and wakes on the next query. Supabase Free *pauses the whole project* after a week without enough database activity, and a paused project takes its Storage down too, so every archived zine's images would break.
2. **Everything is set up from the Vercel dashboard.** Blob stores and the Neon integration add their env vars to the project automatically. There's one bill (free) and one place to watch usage.
3. **Low lock-in.** Postgres, a small storage module and an open-source auth library can each be swapped on their own. The one Vercel-specific piece, Blob, sits behind a small interface, and R2 is the planned escape route.
4. **Private-by-default matches the requirements.** Access is set per store, so "private store for uploads, public store for published photos" follows the Uploads, Selection and Publish flow directly.

## Requirements recap

- Private-by-default photo storage. A photo becomes public per photo, at publish time.
- One admin login. No public accounts.
- Relational data: issues, submissions, photos.
- Free tiers only, hosted on Vercel, Next.js 16.

## Options compared

### A. Supabase all-in-one (Postgres + Storage + Auth)

| Limit (Free) | Value | Source |
|---|---|---|
| Database | 500 MB | [supabase.com/pricing](https://supabase.com/pricing) |
| File storage | 1 GB | same |
| Egress | 5 GB (+5 GB cached egress) | same |
| Max upload size | 50 MB | same |
| Active projects | 2 | same |
| Image transformations | Not included on Free | same |
| Pausing | "Free projects are paused after 1 week of inactivity". Inactive means "does not receive sufficient user database activity over the past week". Restorable within 1 year | [free-project-pausing](https://supabase.com/docs/guides/platform/free-project-pausing) |

Fit:
- Storage access is set **per bucket**, not per object. Private buckets are served with `createSignedUrl` or an authenticated download ([bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals)). `move`/`copy` take a `destinationBucket` option, so publishing is one call from the private bucket to the public one ([copy/move objects](https://supabase.com/docs/guides/storage/management/copy-move-objects)). This is the neatest publish flow of the three.
- Auth: turning off "Allow new users to sign up" means "only existing users can sign in" ([auth general config](https://supabase.com/docs/guides/auth/general-configuration)).
- Uploads go straight from the browser with signed upload URLs, so the Vercel 4.5 MB body limit doesn't apply.

Risks:
- **Pausing is the deal-breaker for an archive site.** Between weekly issues, if pages are cached/static and nobody submits, the database gets no queries. The project pauses and Storage-hosted zine images stop loading. A keep-alive cron would work around this, but that's a hack against the free tier's intent.
- 1 GB storage is the same ceiling as Blob. Egress (5 GB) is lower than Blob's 10 GB.
- More lock-in than option B: auth users live in Supabase's `auth` schema and the app would use the Supabase client SDK. The data is still Postgres.

### B. Neon + Vercel Blob + Better Auth (recommended)

**Neon Free** ([neon.com/pricing](https://neon.com/pricing), [plans docs](https://neon.com/docs/introduction/plans)):

| Limit | Value |
|---|---|
| Storage | 0.5 GB per project |
| Compute | 100 CU-hours per project per month (autoscaling up to 2 CU) |
| Scale to zero | After 5 min idle (always on for Free) |
| Egress | 5 GB per project |
| Projects / branches | 100 projects, 10 branches per project |
| Over limit | Storage cap: writes fail. CU-hours/egress exhausted: compute suspended until next period. "None of these limits delete your data." |

Vercel Postgres no longer exists. Vercel moved it to Neon in December 2024 and points new projects to Postgres integrations in the Marketplace ([vercel.com/docs/postgres](https://vercel.com/docs/postgres)).

**Vercel Blob on Hobby** ([usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)):

| Limit | Value |
|---|---|
| Storage | 1 GB (monthly average) |
| Simple operations (cache-miss URL reads, `head()`) | 10,000 / month |
| Advanced operations (`put`, `copy`, `list`, **dashboard browsing**) | 2,000 / month |
| Blob data transfer | 10 GB / month |
| Over limit | "you will not be able to access Vercel Blob if limits are exceeded … you will have to wait until 30 days have passed". No charges |
| Stores | Unlimited |

Private storage ([private-storage](https://vercel.com/docs/vercel-blob/private-storage)):
- Now GA. Requires `@vercel/blob` >= 2.3. Private/public is chosen **when the store is created**.
- Private blob URLs aren't publicly reachable. You serve them from a route handler that checks auth and then calls `get(pathname, { access: 'private' })`. Vercel advises checking auth in the route handler itself, not relying on middleware/proxy, and not caching private responses in the CDN.
- The SDK takes a `storeId` per call, so one app can use two stores ([SDK docs](https://vercel.com/docs/vercel-blob/using-blob-sdk)). `copy()` works within one store, so publishing is `get` from the private store followed by `put` into the public one.

Uploads ([client uploads](https://vercel.com/docs/vercel-blob/client-upload)):
- Vercel Functions cap request and response bodies at **4.5 MB** ([function limits](https://vercel.com/docs/functions/limitations)). Next.js Server Actions default to 1 MB (`serverActions.bodySizeLimit`, `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`). Photo uploads therefore need **client uploads**: the browser uploads straight to Blob after a token exchange (`handleUpload` / `onBeforeGenerateToken`). Client uploads also avoid data-transfer charges.
- `onBeforeGenerateToken` is where access control goes. There are no photographer accounts, so this is where to verify the Turnstile token and the open-issue/cutoff state (sent via `clientPayload`), and to enforce `allowedContentTypes` and a maximum size.
- `onUploadCompleted` is a webhook from Vercel and can't reach localhost without a tunnel. Record photo rows from the submission form itself rather than relying on the callback.

**Better Auth** (open source, runs in the app, stores data in our Postgres):
- `emailAndPassword: { enabled: true, disableSignUp: true }` ([options reference](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/reference/options.mdx)).
- Listed in the Next.js 16 auth guide's library list (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, "Auth Libraries").
- Auth.js (NextAuth) is now maintained by the Better Auth team. New projects are told to start with Better Auth ([announcement](https://better-auth.com/blog/authjs-joins-better-auth)). That rules out Auth.js for a new build.
- Next.js 16 renamed Middleware to **Proxy** (`proxy.ts`), which runs on Node.js. The docs say Proxy is only for *optimistic* checks and must not be the only authorization layer (`01-app/01-getting-started/16-proxy.md`, `02-guides/authentication.md`). Check the session again in every admin Server Action and route handler.

Risks:
- **Blob's 2,000 advanced ops/month is the tightest limit in the whole stack.** Each photo upload is ≥1 `put`, each published photo is another `put`, and browsing the store in the Vercel dashboard counts too. Rough budget: ~1,500 photo uploads per month, or about 35 full 10-photo submissions a week. That's fine for launch. Going over locks Blob for 30 days, which would break published zines too, since they're served from the public store. Mitigations: watch usage, use `addRandomSuffix` instead of `list()`, and avoid the dashboard browser.
- **1 GB storage.** Unprocessed phone photos (3–8 MB) would fill it after about 200 photos. **Resize/compress in the browser before upload** (e.g. long edge ≤ 2560 px, JPEG/WebP ≈ 0.5 MB). That gives room for about 2,000 photos. Also delete rejected and unselected private blobs after an issue is published. The About page's privacy/retention wording (#1) can cover this.
- Neon 0.5 GB is ample for text rows. Scale-to-zero adds a cold-start delay to the first query after 5 idle minutes.

### C. Neon + Cloudflare R2 + Better Auth

**R2 Free** ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)): 10 GB-month storage, 1M Class A ops, 10M Class B ops per month, **free egress**. Standard storage class only.

Fit:
- 10x the storage and 500x the write operations of Blob. This is the obvious upgrade if Blob's limits start to hurt.
- It uses the S3 API (`@aws-sdk/client-s3`, presigned PUT URLs for browser uploads). Public access is set per bucket (custom domain or r2.dev), so the same two-bucket publish pattern applies (`CopyObject` across buckets).

Risks:
- **A payment card is required to enable R2**, even on the free allowance. Cloudflare community threads report this, and some report unexpected charges. That's a poor fit for a "free tiers only" rule.
- It's a second vendor and dashboard. Env vars, CORS on the bucket and a public domain all need setting up by hand, and none of it plugs into Vercel.

## Option D (not recommended but noted): hand-rolled single-admin session

The Next.js 16 auth guide walks through stateless sessions: a password check in a Server Action plus a `jose`-signed cookie (`02-guides/authentication.md`, "Stateless Sessions"). With one admin, the password hash can live in an env var and no auth tables are needed. It's leaner, but the same guide recommends a library "for increased security and simplicity". Better Auth adds password hashing, rate limiting and session revocation for very little setup. Treat this as the fallback if Better Auth proves too heavy.

## Next.js 16 / Vercel Hobby limits that shape the build

| Fact | Source |
|---|---|
| Function request/response body max 4.5 MB | [functions/limitations](https://vercel.com/docs/functions/limitations) |
| Server Actions body default 1 MB | `next/dist/docs/01-app/02-guides/server-actions.md` |
| Hobby function max duration 300 s (fluid compute) | [functions/limitations](https://vercel.com/docs/functions/limitations) |
| Hobby Image Optimization: 5K transformations, 300K cache reads, 100K cache writes / month. Over limit, *new* images fail with 402 (already-cached ones still work) | [image-optimization limits](https://vercel.com/docs/image-optimization/limits-and-pricing) |
| Hobby: 100 GB Fast Data Transfer, 10 GB Fast Origin Transfer, 1M function invocations, 4 h Active CPU / month | [fair-use-guidelines](https://vercel.com/docs/limits/fair-use-guidelines) |
| **Hobby is non-commercial only** (ads, selling, paid work on the site all count as commercial; donations don't) | same |
| Middleware is now `proxy.ts`, Node.js runtime, optimistic checks only | `next/dist/docs/01-app/01-getting-started/16-proxy.md` |

Implications:
- Serve zine images through `next/image` with the public Blob host in `images.remotePatterns`. Keep the number of `sizes`/widths small and set a long `minimumCacheTTL` so the 5K transformations/month lasts. Alternatively, pre-size images at upload and use `unoptimized`.
- If the zine ever makes money (ads, prints, paid features), Vercel Hobby no longer applies. That's a separate decision from this stack, but worth noting next to the "own domain later" plan.

## Summary table

| | A: Supabase | **B: Neon + Blob + Better Auth** | C: Neon + R2 + Better Auth |
|---|---|---|---|
| Storage | 1 GB | 1 GB | 10 GB |
| Upload op budget | Not metered | **2,000 writes/mo** | 1M writes/mo |
| Egress | 5 GB | 10 GB (Blob) | Unlimited |
| Pauses when idle | **Yes, whole project incl. images** | No (DB cold start only) | No |
| Card required | No | No | **Yes** |
| Private → public per photo | Move across buckets (1 call) | get + put across stores | CopyObject across buckets |
| Vercel integration | Marketplace | Native + Marketplace | Manual |
| Lock-in | Medium (auth schema, SDK) | Low–medium (Blob behind a module) | Low (S3 API) |

## Open follow-ups for the build

- Put storage behind a small module (`putPrivate`, `readPrivate`, `publish`, `remove`) so moving from Blob to R2 is a one-file change.
- Decide on an ORM or query builder (Drizzle has a Better Auth adapter). Out of scope here.
- Client-side resize before upload belongs in the Submit slice.
- Delete unselected uploads after publish. This ties into the privacy note on the About page.
