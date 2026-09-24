# Image pipeline: uploading and serving up to 10 photos per submission

Research for [#3](https://github.com/mt-ch/photo-zine/issues/3) (map: [#1](https://github.com/mt-ch/photo-zine/issues/1)). Checked 2026-09-24 against Next.js 16.3.6 (`node_modules/next/dist/docs/`) and current vendor docs.

The storage provider is being chosen in [#2](https://github.com/mt-ch/photo-zine/issues/2), so this note covers Supabase Storage, Vercel Blob and Cloudflare R2 side by side. It does not pick one.

## Answer

1. **Resize and strip metadata in the browser.** Decode each chosen file with `createImageBitmap` (this applies EXIF orientation), draw it to a canvas with the long edge capped at about 2560 px, and re-encode it as JPEG at about 0.85 quality. The output has no EXIF, so no GPS, and is typically under 2 MB.
2. **Upload straight from the browser to a private bucket or store** using a short-lived signed URL or token per photo. The server issues it only after the Turnstile check and form validation pass. Photo bytes never pass through a Vercel Function, so the 4.5 MB function body limit does not apply.
3. **Finalise on the server.** Once the uploads finish, the browser calls a Server Action. The server checks each object exists and that its size and type are right (HEAD / `head()`), then marks the Submission complete. Don't rely on upload webhooks.
4. **Publish by re-encoding into public storage.** When the admin publishes, a server job reads each Selection photo from private storage, re-encodes it with `sharp` (rotates and strips all metadata by default, which is the second privacy guard), and writes one "display master" of about 2048 px to a **separate public** bucket or store under an immutable path.
5. **Serve the zine with `next/image`** from the public URLs, tuned for the quota: one format, trimmed `deviceSizes`, long `minimumCacheTTL`. The fallback if Vercel's 5K transformations a month ever gets tight is to pre-generate 2–3 widths at publish time and serve them with `unoptimized` or a custom loader.
6. **Admin moderation views don't use the optimiser.** Private images can't go through Vercel's `next/image` because the optimiser doesn't forward auth headers. Serve them through an authenticated route or a short-lived signed URL, rendered `unoptimized`.

**Tightest free-tier constraints.** Storage size is the first: 1 GB on Blob and Supabase, and it adds up over time. On Vercel Blob, advanced operations are next (2,000 a month, one per upload). Vercel image transformations (5K a month) come after that.

---

## 1. Getting bytes from the browser to storage

### Vercel body limits rule out proxying uploads through the app

- Vercel Functions: "The maximum payload size for the request body or the response body of a Vercel Function is **4.5 MB**", above which you get `413: FUNCTION_PAYLOAD_TOO_LARGE`. ([Vercel Functions limits](https://vercel.com/docs/functions/limitations#request-body-size))
- Next.js Server Actions: "By default, the maximum size of the request body sent to a Server Action is 1MB". You can raise it with `experimental.serverActions.bodySizeLimit`, and the limit counts multipart overhead. (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`) Raising it doesn't get past Vercel's 4.5 MB platform cap.
- A single high-resolution phone or camera JPEG can exceed 4.5 MB on its own, and a 10-photo submission certainly does. **Direct-to-storage uploads are required**, not optional.

### How each provider does direct uploads

| | Vercel Blob | Supabase Storage | Cloudflare R2 |
|---|---|---|---|
| Mechanism | `upload()` from `@vercel/blob/client` + a `handleUpload()` route that mints a client token | `createSignedUploadUrl(path)` on the server → `uploadToSignedUrl()` in the browser | S3 presigned `PUT` URL (AWS SDK v3 `getSignedUrl`) |
| Server-side constraints on the token | `allowedContentTypes`, `maximumSizeInBytes`, `validUntil`, `addRandomSuffix` ([SDK ref](https://vercel.com/docs/vercel-blob/using-blob-sdk)) | Bucket-level `file_size_limit` and `allowed_mime_types` ("Upload restrictions like max file size and allowed content types are also defined at the bucket level", [bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals)) | `Content-Type` can be signed into the URL ("uploads will fail with a 403/SignatureDoesNotMatch error if the client sends a different Content-Type"). **Size cannot be enforced up front**: `PostObject` (the S3 POST-policy form upload with `content-length-range`) is not in R2's implemented API list ([R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/)), so check size with HEAD after upload |
| URL / token lifetime | `validUntil` (you choose) | Signed upload URLs are valid for 2 hours ([JS ref](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)) | 1 s to 7 days ([R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)) |
| Browser setup | none | none | Bucket CORS rules required for browser use (same page) |
| Completion signal | `onUploadCompleted` webhook, which "will not work" on localhost without a tunnel ([client upload guide](https://vercel.com/docs/vercel-blob/client-upload#local-development)). Prefer an explicit finalise call | none built in; finalise call | none built in; finalise call |
| Upload data transfer cost | "Uploads do not incur data transfer charges when using Client Uploads" ([Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)) | counts as ingress (free) | free |
| Size guidance | multipart recommended above 100 MB (not relevant) | Standard upload "ideal for small files that are not larger than 6MB"; TUS resumable above that ([standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)). Free-plan max upload is **50 MB** ([pricing](https://supabase.com/pricing)) | not relevant at these sizes |

**Why an explicit finalise step:** the Submission row, its photo paths and the rights checkbox must be written together. A browser-driven "all 10 PUTs succeeded → call `finalizeSubmission`" Server Action works the same way on all three providers and in local dev. Only a tiny JSON payload goes through the function. Orphaned uploads from abandoned forms can be swept later by path prefix.

**Security note (Blob):** Vercel says you "**must** authenticate and authorize users in `onBeforeGenerateToken`" or anyone can upload ([client upload guide](https://vercel.com/docs/vercel-blob/client-upload)). Photo Zine has no photographer accounts, so the gate is Turnstile + honeypot + an issue that is still open + one submission per email. Tie tokens to a pending Submission id and cap them at 10. The same applies to Supabase signed URLs and R2 presigned URLs.

## 2. Per-file size and format limits

Recommended limits. These are a judgement call, grounded in the constraints below.

| Stage | Limit |
|---|---|
| File picker (`accept`) | `image/jpeg,image/png,image/webp` (see the HEIC caveat below) |
| Raw file the browser will try to process | ≤ 30 MB, ≤ 50 MP (anything bigger risks canvas memory limits on phones) |
| What actually gets uploaded | JPEG only, long edge ≤ 2560 px, **≤ 5 MB** enforced server-side (`maximumSizeInBytes` / bucket `file_size_limit` / post-upload HEAD on R2) |
| Count | ≤ 10 per Submission (configurable, per #1) |

Constraints behind these numbers:
- Vercel's optimiser only transforms `image/jpeg`, `image/png`, `image/webp`, `image/avif`. "Other formats will be served as-is". Sources are limited to 8192 × 8192 px and output to 10 MB. ([Vercel image limits](https://vercel.com/docs/image-optimization/limits-and-pricing#limits))
- Next.js's optimiser fetches source images up to 50 MB by default (`images.maximumResponseBody`). (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`)
- Supabase transforms (Pro only) accept sources up to 25 MB and 50 MP. They can read HEIC but can't output it. ([Supabase image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations))
- Storage budget: at about 1–1.5 MB per processed photo, one full submission is about 10–15 MB. **1 GB holds roughly 70–100 full submissions in total, not per month.** Uploading originals (often 5–20 MB each) would use it up about 10× faster. This is the main reason to resize in the browser.

**HEIC caveat (unverified, secondary sources only):** iOS Safari reportedly converts HEIC to JPEG when the input's `accept` lists only JPEG-type MIME types, and Safari 17+ behaviour has changed around this ([Apple dev forum thread](https://developer.apple.com/forums/thread/743049), [shkspr.mobi write-up](https://shkspr.mobi/blog/2020/12/coping-with-heic-in-the-browser/)). Chrome and Firefox on desktop can't decode HEIC in canvas. Plan: don't list HEIC in `accept`. If `createImageBitmap` throws, show "Please export as JPEG". Test on a real iPhone during the build.

## 3. Resized versions: at upload, at publish, or on demand?

| Option | Pros | Cons |
|---|---|---|
| **In the browser, at upload** (canvas re-encode) | Free; bypasses body limits; strips EXIF; saves storage by about 10× | Not trustworthy (a malicious client can skip it); fails on formats the browser can't decode |
| **On the server, at publish** (`sharp` in a Server Action or Route Handler) | Trusted; strips metadata again; runs only on Selected photos (a few dozen per issue); output is immutable and public | Needs a function run per photo at publish (well within Hobby's 300 s / 2 GB, per [function limits](https://vercel.com/docs/functions/limitations)) |
| **On demand** (`next/image` on Vercel, or a provider transform) | Responsive `srcset`, AVIF/WebP negotiation with no code | Metered (see §4); only works on public sources |

**Recommendation:** use all three in layers. Browser resize at upload (storage + privacy), a `sharp` re-encode into the public location at publish (trusted privacy + immutability), and on-demand `next/image` for responsive widths in the zine.

On Vercel Blob, `putImage()` can do the publish-time step without bundling `sharp`: "optimizes and stores images at write time". Each call is "1 image transformation + standard blob upload" and requires OIDC credentials ([Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)). Vercel doesn't document whether its hosted transform strips EXIF, so plain `sharp` is the safer default for the privacy guarantee.

## 4. Serving: `next/image` quotas vs provider transforms

### Vercel Image Optimization (Hobby)

From [Vercel limits and pricing](https://vercel.com/docs/image-optimization/limits-and-pricing):

| | Hobby included |
|---|---|
| Image transformations | 5K / month |
| Image cache reads | 300K / month |
| Image cache writes | 100K / month |

- "Image transformations are billed for every cache MISS and STALE." The cache key is project + `url` + `w` + `q` + the normalised `Accept` header ([cache key](https://vercel.com/docs/image-optimization#remote-images-cache-key)). Every width × format × quality × source URL counts as a separate transformation.
- Over the limit on Hobby: "New images will fail to optimize and instead return a runtime error response with 402 status code… Previously optimized images… will continue to work". There is no charge.
- **Hobby is "restricted to non-commercial personal use only"** (same page). This is a project-level risk if Photo Zine ever makes money.
- Remote image TTL is the larger of upstream `Cache-Control` max-age and `minimumCacheTTL`. Next.js 16 changed the default to **4 hours** (14400 s) (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`). Vercel's page still says 3600, which is out of date. Every expiry triggers STALE and another billed transformation. So set a long TTL: published zine images never change because their paths are immutable.
- Private sources don't work: "the Image Optimization API using the default loader will _not_ forward headers when fetching the `src` image. If the `src` image requires authentication, consider using the unoptimized property" (Next.js image docs). **Signed URLs are also a poor fit**: the signature is part of `url`, so each new signature is a new cache key and a new transformation.

**Rough budget.** A zine of 30 photos with `sizes` producing about 4 widths used in practice, and one format, needs about 120 transformations to warm. Each TTL expiry adds up to the same again. With a 31-day TTL, a year of weekly zines plus the archive stays well under 5K/month. With the Next 16 defaults (8 `deviceSizes` + AVIF/WebP + 4 h TTL), the same traffic could use it up.

**Suggested `next.config.ts` images block** (options per `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`):

```ts
images: {
  remotePatterns: [new URL('https://<public-host>/zine/**')], // pin to the public zine prefix only
  formats: ['image/webp'],                 // one format = half the cache keys of avif+webp
  deviceSizes: [640, 1080, 1600, 2048],    // fewer widths = fewer transformations
  imageSizes: [256, 384],                  // for thumbnails on Archive/Home
  qualities: [75],                         // Next 16 default; keep it single
  minimumCacheTTL: 2678400,                // 31 days; paths are immutable
}
```

### Provider transforms (alternatives to `next/image`)

| Provider | Free-tier transforms | Notes |
|---|---|---|
| Vercel Blob | Uses Vercel Image Optimization (above), or `putImage()` at write time | Public store needed for `next/image` |
| Supabase Storage | **None**: image transformations are "Not included" on Free and start at Pro ([pricing](https://supabase.com/pricing)) | Free tier = serve the stored file as-is, or put `next/image` in front of a public bucket URL |
| Cloudflare R2 | Cloudflare Images: "up to 5,000 unique transformations each month for free", sources can be R2 or any origin, over the limit returns error `9422` with no charge ([Images pricing](https://developers.cloudflare.com/images/pricing/)) | Needs a domain on Cloudflare. The `r2.dev` public URL "is rate-limited and should only be used for development purposes". Custom domains must be a zone in the same Cloudflare account ([public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)). #1 says the own domain comes later, so this path isn't available on day one |

**Conclusion:** `next/image` on Vercel is the one on-demand transform that works the same for all three providers on day one. The zero-quota fallback (pre-generated widths + `unoptimized`) works everywhere too.

## 5. Private uploads, public zine

#1 settles "Uploads are stored privately; photos go public only when selected into a published zine."

| | How "private" works | How to publish |
|---|---|---|
| Vercel Blob | Access is **per store** and "you cannot change it after the creation of a blob store". Private blobs are read only via `get()` in a Function; "Delivery: Through your Functions" ([Blob overview](https://vercel.com/docs/vercel-blob)) | Two stores: `submissions` (private) and `zine` (public). Publish = `get()` + `sharp` → `put()` (or `putImage()`) into the public store. Serving private blobs costs Blob Data Transfer + Fast Data Transfer through a Function ([private storage](https://vercel.com/docs/vercel-blob/private-storage)), which is fine for admin-only traffic |
| Supabase Storage | Private bucket: RLS-controlled, reads via `download` with JWT or `createSignedUrl` "for a limited time" ([buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)) | Two buckets: `submissions` (private), `zine` (public). Publish = download + `sharp` → upload to public bucket |
| Cloudflare R2 | Buckets are private unless public access (r2.dev or custom domain) is enabled; reads via presigned GET (≤ 7 days) | Two buckets, or one private bucket plus one public bucket on a custom domain. Before a Cloudflare-hosted domain exists, public serving would have to go through `r2.dev` (dev-only, rate-limited) or a Vercel proxy route |

Admin moderation view (private images): use an authenticated Route Handler that streams the object, or a short-lived signed URL, with `<Image unoptimized>` or a plain `<img>`. The browser-side resize keeps these files around 1–2 MB, which is acceptable for one admin.

## 6. Stripping location EXIF

- **Browser:** re-encoding through canvas writes only pixels, so EXIF (including GPS) is dropped. `createImageBitmap`'s default `imageOrientation: "from-image"` applies the EXIF orientation first, so the photo isn't sideways after stripping ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)).
- **Server (publish):** sharp "By default all metadata will be removed, which includes EXIF-based orientation", unless `keepMetadata()` / `withMetadata()` / `keepExif()` are used ([sharp output API](https://sharp.pixelplumbing.com/api-output)). Call `.rotate()` with no arguments before resizing to bake in orientation. Next.js's own optimiser does exactly this: `sharp(buffer).timeout(...).rotate()` then resize and encode, with no metadata retention (`node_modules/next/dist/server/image-optimizer.js`, `optimizeImage`). That is the self-hosted/dev path. Vercel's hosted optimiser isn't documented on metadata.
- **Why both:** the browser step can be bypassed by a crafted request, so the photographer's own GPS could end up in *private* storage. The publish-time `sharp` pass guarantees nothing public ever carries metadata. Never serve the private original publicly.
- Camera/EXIF display is out of scope in #1, so nothing needs to be kept.

## 7. Free-tier budget per provider (storage side)

| | Vercel Blob (Hobby) | Supabase (Free) | Cloudflare R2 (Free) |
|---|---|---|---|
| Storage | 1 GB-month | 1 GB | 10 GB-month |
| Writes | **2,000 advanced ops/month** (each `put`/`upload`/`copy`/`list`, and dashboard browsing counts too) | not metered | 1M Class A/month |
| Reads | 10,000 simple ops (cache misses) + 10 GB transfer | 5 GB egress + 5 GB cached egress | 10M Class B/month; egress free |
| Over the limit | "you will not be able to access Vercel Blob… wait until 30 days have passed" | (see #2) | billed (card on file) |
| Other | Rate limit 900 advanced ops/min on Hobby | Project pauses after 1 week of inactivity; max upload 50 MB | Public production serving needs a Cloudflare zone |

Sources: [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing), [Supabase pricing](https://supabase.com/pricing), [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Blob write math: 10 photos = 10 advanced ops per submission. Publishing a 30-photo zine adds about 30 more. **About 150 full submissions a month** fits 2,000 with room to spare. A lockout lasting 30 days in the middle of an issue would be severe, though. Don't use `list()` in hot paths, and keep dashboard browsing to a minimum.

## Risks and open questions

1. **Storage fills up over time** (1 GB on Blob/Supabase). The retention policy should delete unselected and rejected photos some time after publish. This feeds the About-page privacy note (#1, "Not yet specified").
2. **Vercel Blob Hobby lockout**: going over 2,000 advanced ops blocks Blob for 30 days.
3. **Hobby is non-commercial only**, for Vercel as a whole, not just images.
4. **HEIC / huge files on phones**: canvas decoding can fail or run out of memory. Needs real-device testing, and the UI needs a clear error.
5. **Client-side processing can be bypassed**: enforce type and size server-side (token, bucket or HEAD check), and rely on the publish-time `sharp` pass for privacy.
6. **R2 before an own domain**: no production-grade public URL without a Cloudflare zone.
7. **Supabase free projects pause** after a week of inactivity. Fine for weekly issues, but worth noting for #2.
8. Unverified: whether Vercel's hosted optimiser and `putImage()` strip EXIF (undocumented). The design above doesn't depend on it.
