# Next.js 16, shadcn/ui and Tailwind 4 conventions to build on

Research for issue #4 (map: #1). Researched 2026-09-24 against:

- **Next.js 16.3.6**: the bundled docs at `node_modules/next/dist/docs/` (paths below are relative to that folder). These are the primary source. Training-data knowledge of Next 13–15 is out of date in several places.
- **shadcn/ui**: CLI `shadcn@4.21.0` (npm, Sept 2026). Docs source from `github.com/shadcn-ui/ui`, `apps/v4/content/docs/`, which renders to ui.shadcn.com.
- **Tailwind CSS 4.3.3**: tailwindcss.com/docs/theme.

Statements marked **(inference)** are my reading of the docs, not something the docs say directly.

## TL;DR

1. **Caching has two models. Pick one first.** Next 16 adds **Cache Components** (`cacheComponents: true`): data is dynamic by default and you opt in with `'use cache'`, `cacheLife` and `cacheTag`. The getting-started docs assume this model. The "previous model" (`fetch` cache options, `unstable_cache`, route-segment `revalidate`/`dynamic`) still works and is documented separately. Our scaffold has **not** enabled it (`next.config.ts` is empty).
2. **Publishing a zine**: tag cached reads (for example `cacheTag('zines')`). The publish Server Action calls `updateTag('zines')`, which expires the tag immediately and re-renders in the same response, or `revalidatePath('/')` and `revalidatePath('/archive')`. **`revalidateTag` now needs a second argument** (`revalidateTag('zines', 'max')`), and it is stale-while-revalidate.
3. **`/admin` protection**: `middleware.ts` has been **renamed to `proxy.ts`** (export `proxy`, Node runtime only). Use it only for an *optimistic* cookie check and redirect. The real check is a Data Access Layer `verifySession()` called in every admin page **and every Server Action**. Layouts are not a security boundary.
4. **Forms**: `<form action={serverAction}>` plus `useActionState` (returns `[state, formAction, pending]`) and Zod validation. **Server Action bodies are capped at 1 MB by default**, so up to 10 photos can't go through an action as-is (see the upload note).
5. **Link previews**: add `app/<route>/opengraph-image.tsx` that returns `new ImageResponse(...)` from `next/og`. **`params` (and `id`) are now Promises** in image functions. Only flexbox and a CSS subset are supported, the bundle is capped at 500 KB, and fonts must be ttf, otf or woff.
6. **Async request APIs are now async-only**: `cookies()`, `headers()`, `draftMode()`, `params` and `searchParams` must be awaited. Synchronous access is fully removed. Use the `PageProps<'/route'>` and `LayoutProps` global type helpers.
7. **shadcn/ui on Tailwind 4**: run `pnpm dlx shadcn@latest init` in the existing app. There is no `tailwind.config.js`: `components.json` has `tailwind.config: ""`. Tokens are CSS variables in `:root` and `.dark` (OKLCH), exposed to Tailwind with `@theme inline { --color-x: var(--x) }`. `tw-animate-css` replaces `tailwindcss-animate`. Sonner replaces Toast. The `new-york` style replaces `default`. `style`, `baseColor` and `cssVariables` **cannot be changed after init**. CLI v4 adds `--base radix|base|aria` and `--preset`.

---

## 1. Server Actions and forms

Sources: `01-app/02-guides/server-actions.md`, `01-app/02-guides/forms.md`, `01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`

- A Server Action is a function marked `'use server'` and invoked through `<form action>`, `<button formAction>` or a transition. The form passes a `FormData`. `Object.fromEntries(formData)` includes extra `$ACTION_*` keys (forms.md).
- **Validation errors**: make the form a Client Component and use React's `useActionState(action, initialState)`. The action's signature becomes `(prevState, formData)`. `pending` is the third tuple item (forms.md "Validation errors", "Pending states").
- **Security** (server-actions.md "Security"): each action is a public POST endpoint. Next checks `Origin` against `Host`/`X-Forwarded-Host` for CSRF, encrypts action IDs, and strips unused actions. *Inside every action*: authenticate and authorize, validate inputs, and shape the return values. "Render-time gating ... is not a security boundary."
- **Body size limit: 1 MB by default.** You can raise it with `experimental.serverActions.bodySizeLimit` (note that it sits under `experimental`). The limit counts the raw multipart body, so leave 10–20 KB for overhead (serverActions.md).
  - **Implication for Submit (inference):** 10 full-resolution photos won't fit in 1 MB. Either upload directly from the browser to storage (signed upload URLs) and send only keys and metadata through the action, or raise the limit. Also check the host's own request-size limit, which is outside Next's docs. Hand this to the storage/upload ticket.
- Actions are **dispatched one at a time per client**, so `Promise.all` on actions doesn't run them in parallel (server-actions.md).
- **Single round trip**: when an action calls `updateTag`, `revalidatePath`, `refresh()`, sets a cookie or calls `redirect`, the response includes the re-rendered route. `redirect` throws, so revalidate *before* redirecting. `revalidateTag(tag, 'max')` does **not** trigger an immediate re-render.
- **Deploys** rotate action IDs, which gives "Failed to find Server Action" to clients still on the old build. Show a retry/refresh path in the UI.
- shadcn's Next forms guide (`apps/v4/content/docs/forms/next.mdx`) builds exactly this pattern: `next/form` `<Form action={formAction}>`, the new **`<Field>` / `<FieldLabel>` / `<FieldError>`** components, `useActionState`, and Zod (any Standard Schema library) on the server. It is a good template for Submit and the admin forms, with no react-hook-form needed.

## 2. Caching and revalidation (publish → Home and Archive update)

Sources: `01-app/01-getting-started/08-caching.md`, `09-revalidating.md`, `01-app/02-guides/caching-without-cache-components.md`, `03-api-reference/05-config/01-next-config-js/cacheComponents.md`, `03-api-reference/04-functions/{revalidatePath,revalidateTag,updateTag}.md`, `03-api-reference/01-directives/use-cache.md`, `02-guides/upgrading/version-16.md`

### Two models

| | Cache Components (`cacheComponents: true`) | Previous model (flag off, our current state) |
|---|---|---|
| Default | Everything dynamic; opt in with `'use cache'` | Pages prerender unless they use dynamic APIs; `fetch` not cached by default |
| Cache a DB read | `'use cache'` + `cacheLife(...)` + `cacheTag(...)` inside the function | `unstable_cache(fn, keys, { tags, revalidate })` |
| Route config | PPR by default: static shell plus streamed `<Suspense>` holes | `export const revalidate` / `dynamic` segment config |
| Request data (`cookies()` etc.) | Must sit inside `<Suspense>` or the build warns about a "blocking route" | Makes the whole route dynamic |

- `cacheComponents` is a **single top-level flag** that replaces `experimental.ppr`, `experimental.dynamicIO` and `experimental.useCache`, which have all been removed. Turning it on "is not a rename-only change": uncached data outside `<Suspense>` becomes a build error (version-16.md). It also keeps navigated-away routes mounted with React `<Activity>` (cacheComponents.md). It requires the Node runtime.
- `cacheLife` and `cacheTag` are now stable, so drop the `unstable_` prefix. Built-in profiles: `default` (5m/15m/never), `seconds`, `minutes`, `hours`, `days`, `weeks`, `max` (5m stale / 30d revalidate / 1y expire). The docs recommend pairing every `'use cache'` with a `cacheLife`.
- **`Date.now()`, `Math.random()` and `crypto.randomUUID()`** must be handled explicitly under Cache Components: call `await connection()` (from `next/server`) and wrap in `<Suspense>`, or cache the value (08-caching.md "Random values and timestamps"). **This matters here** because an Issue closes when `now >= cutoff` with no scheduled job. The open/closed check on Submit (and on Home, if it shows status) must run at request time and not be baked into a cached shell **(inference)**.
- On serverless hosts the runtime `'use cache'` store is in-memory and **doesn't persist across requests**. Build-time and static-shell caching still work normally. `'use cache: remote'` is the durable option, and it has platform cost (use-cache.md "Runtime caching considerations").

### Invalidation APIs (Next 16)

| API | Where | Behaviour | Changed in 16 |
|---|---|---|---|
| `updateTag(tag)` | **Server Actions only** | Expires immediately; the action's re-render waits for fresh data (read-your-writes) | **New** |
| `revalidateTag(tag, profile)` | Server Actions and Route Handlers | Stale-while-revalidate; no immediate re-render | **Second argument now required** (single-argument form deprecated and a TS error) |
| `revalidatePath(path, type?)` | Server Functions and Route Handlers | Invalidates a route; `type` is required for dynamic patterns like `/zine/[slug]` | — |
| `refresh()` | Server Actions | Re-fetches the current route's RSC payload without touching the cache | **New** |

The docs prefer tags over paths ("more precise and avoids over-invalidating", 09-revalidating.md).

**Suggested publish flow (inference):** cache the Home, Archive and Zine reads under a shared tag with `cacheLife('max')`. The admin "publish" Server Action writes to the DB, calls `updateTag('zines')` (plus a per-issue tag if useful), then `redirect`s. Without Cache Components, the equivalent is `unstable_cache(..., { tags: ['zines'] })` plus the same call, or `revalidatePath('/')`, `revalidatePath('/archive')` and `revalidatePath('/zine/[slug]', 'page')`.

## 3. Route protection for `/admin`

Sources: `01-app/01-getting-started/16-proxy.md`, `03-api-reference/03-file-conventions/proxy.md`, `02-guides/authentication.md`, `02-guides/authentication-with-cache-components.md`, `05-config/01-next-config-js/authInterrupts.md`

- **`middleware.ts` → `proxy.ts`** (breaking rename). The named export `middleware` becomes `proxy` (default export also allowed). The file lives at the project root next to `app/`, and there is one per project. Config flags have been renamed too (for example `skipMiddlewareUrlNormalize` is now `skipProxyUrlNormalize`). **Proxy runs on Node only.** Setting `runtime` throws, and the edge runtime is only available by staying on the deprecated `middleware`. `fetch` cache options have no effect in Proxy.
- The docs define two layers (authentication.md "Authorization"):
  1. **Optimistic check in Proxy (optional)**: read and decrypt the session cookie only, with no DB calls, because Proxy runs on every route including prefetches. Redirect to the login page when it is missing. Use `matcher` (for example `'/admin/:path*'`).
  2. **Secure check in a Data Access Layer**: `verifySession()` / `getUser()` close to the data, called from admin pages, **every Server Action**, and Route Handlers. Return DTOs rather than raw rows.
- **Don't rely on layouts for auth.** They don't re-render on navigation, and they don't stop child segments from rendering or appearing in the RSC payload.
- **Sessions**: stateless (encrypted cookie) or database sessions. The docs recommend a library: iron-session or jose. For a single Admin, a stateless iron-session cookie is the lean fit **(inference)**. The docs list full auth providers (Auth.js, Better Auth, Clerk, Supabase, …) if that is ever wanted.
- With Cache Components on, reading the session is request-time. Stream admin UI behind `<Suspense>`. Don't call `cookies()`/`headers()` inside a plain `'use cache'` function (it throws). Don't put secrets or PII in cache keys or tags (authentication-with-cache-components.md "Common pitfalls").
- `unauthorized()` / `forbidden()` and their `unauthorized.tsx` / `forbidden.tsx` files are still **experimental** (`experimental.authInterrupts`, canary). Avoid them for the MVP and use `redirect('/admin/login')`.

## 4. Link-preview (Open Graph) images

Sources: `01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`, `03-api-reference/04-functions/image-response.md`, `01-getting-started/14-metadata-and-og-images.md`

- Put `opengraph-image.tsx` (and optionally `twitter-image.tsx`) in the route segment, for example `app/zine/[slug]/opengraph-image.tsx`. Export `alt`, `size` (`{ width: 1200, height: 630 }`) and `contentType` (`'image/png'`), and a default async function returning `new ImageResponse(jsx, { ...size, fonts })` from **`next/og`**. Next injects the `og:image*` meta tags. A static `opengraph-image.png` (plus `.alt.txt`) also works for Home and About.
- **Breaking in 16:** the image function receives **`params` as a Promise** (`const { slug } = await params`). With `generateImageMetadata`, `id` is `Promise<string>` too. `generateImageMetadata` itself still gets synchronous `params`.
- These are special Route Handlers. They are **statically generated and cached by default** unless they use request-time APIs or uncached data. After publishing, invalidate them through the same tag/path as the zine page **(inference)**.
- `ImageResponse` limits: Satori + Resvg. **Flexbox and a CSS subset only (no `display: grid`)**. The **500 KB bundle cap** covers JSX, fonts and images. Fonts must be **ttf, otf or woff**. The docs' examples load font files with `readFile` at module scope. Styling uses inline `style` objects in the docs, so the zine's theme tokens need a copy JS can read to be reused here **(inference)**. For a photo collage, load photos from their public URLs rather than bundling them.

## 5. Other Next 16 breaking changes to heed

From `02-guides/upgrading/version-16.md` unless noted:

- **Async request APIs are async-only**: `cookies`, `headers`, `draftMode`, and `params`/`searchParams` in pages, layouts, routes, `default` and metadata image files. Use `PageProps<'/zine/[slug]'>`, `LayoutProps` and `RouteContext` (global types from `next typegen`; the scaffold's `layout.tsx` already uses `LayoutProps<"/">`).
- **Turbopack is the default** for `dev` and `build`. Turbopack config is top-level (not under `experimental`).
- **`next/image`**: `images.domains` is deprecated, so use `remotePatterns` for the storage host. `minimumCacheTTL` default is now 4 h. Default `qualities` and `imageSizes` changed. Local images with query strings need `localPatterns.search`. Local IP optimisation is blocked by default.
- **`next lint` removed**: use ESLint flat config and `eslint .` (the scaffold already does this).
- `serverRuntimeConfig`/`publicRuntimeConfig` removed: use env vars (`NEXT_PUBLIC_` for the client) and `connection()` for runtime reads.
- Parallel routes need an explicit `default.js`. AMP has been removed. `unstable_rootParams` is now `next/root-params`.
- React 19.2 (View Transitions, `useEffectEvent`, `<Activity>`). The React Compiler is stable but **off by default** (`reactCompiler: true` plus `babel-plugin-react-compiler`).

## 6. shadcn/ui on Tailwind 4 with CSS-variable tokens

Sources: shadcn-ui/ui `apps/v4/content/docs/`: `installation/next.mdx`, `installation/manual.mdx`, `(root)/tailwind-v4.mdx`, `(root)/theming.mdx`, `(root)/components-json.mdx`, `(root)/cli.mdx`, `changelog/2026-03-cli-v4.mdx`, `dark-mode/next.mdx`, `forms/next.mdx`; tailwindcss.com/docs/theme.

### Setup (existing Next app)

1. Check that `tsconfig.json` has `"@/*": ["./*"]` (it already does).
2. `pnpm dlx shadcn@latest init`. This writes `components.json`, adds the `cn` util, installs dependencies, and writes the CSS variables into the global CSS file (`app/globals.css`).
   - CLI v4 flags: `--template next`, `--base radix|base|aria` (the primitive library: Radix, Base UI or React Aria), `--preset <code>` (colours, fonts, radius and icons packed into one code built at ui.shadcn.com/create; re-running `init --preset` switches), `--css-variables` (default) or `--no-css-variables`, `--defaults` (= `--template=next --preset=nova`), and `--rtl`/`--pointer`.
3. `pnpm dlx shadcn@latest add button field input …`. New flags: `--dry-run`, `--diff` (check upstream updates) and `--view`. `shadcn info` and `shadcn docs <component>` are there for agent context.

**Decide before init, because it can't be changed after** (components.json.mdx): `style`, `tailwind.baseColor` (neutral, stone, zinc, mauve, olive, mist, taupe) and `tailwind.cssVariables`. Switching `cssVariables` means deleting and re-installing components. Keep `cssVariables: true`, since the map requires shared tokens.

### What the Tailwind 4 setup looks like

- **No `tailwind.config.js`.** In `components.json`, `tailwind.config` stays `""` and `tailwind.css` points at the CSS file. PostCSS uses `@tailwindcss/postcss` (already in the scaffold; Next's `01-getting-started/11-css.md` shows the same setup).
- The global CSS structure (manual.mdx):
  ```css
  @import "tailwindcss";
  @import "tw-animate-css";
  @import "shadcn/tailwind.css";
  @custom-variant dark (&:is(.dark *));
  @theme inline { --color-background: var(--background); /* …one per token… */
                  --radius-sm: calc(var(--radius) * 0.6); /* …up to 4xl */ }
  :root { --radius: 0.625rem; --background: oklch(1 0 0); /* … */ }
  .dark { --background: oklch(0.145 0 0); /* … */ }
  @layer base { * { @apply border-border outline-ring/50; } body { @apply bg-background text-foreground; } }
  ```
- **Token convention**: semantic `x` / `x-foreground` pairs: `background`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5` and `sidebar-*`. There is one `--radius` that derives `radius-sm..4xl`. To **add a token** (for example zine paper and ink colours, or spacing), define it in `:root` and `.dark`, then map it in `@theme inline { --color-warning: var(--warning); }` to get `bg-warning` and similar utilities (theming.mdx).
- **Why `@theme inline`** (Tailwind docs): `@theme` variables create utility classes. `inline` makes the utility use the variable's *value*, which is needed when a theme variable references another variable. Plain `:root` variables create no utilities. The scaffold's `globals.css` already uses this pattern for `--background`, `--foreground` and the Geist fonts.
- **Fonts**: `next/font` sets `--font-*` on `<html>`, and `@theme inline { --font-sans: var(--font-geist-sans) }` wires it in (already in the scaffold). CLI v4 can also install fonts as registry items (`registry:font`).

### Breaking changes versus older shadcn (Tailwind 3 era), from tailwind-v4.mdx

- Colours are **OKLCH** (were HSL). Variables now live in `:root`/`.dark` outside `@layer base`, with full colour values instead of bare `H S L` triplets, so charts use `var(--chart-1)` and not `hsl(var(--chart-1))`.
- **`tailwindcss-animate` is deprecated**: use `@import "tw-animate-css"`.
- Components have **no `forwardRef`** (React 19). Every primitive has a **`data-slot`** attribute for styling hooks.
- **The `default` style is deprecated**, so use `new-york`. The v4 docs' manual example shows style names like `base-nova`, meaning style and base are now combined with presets.
- **Toast is deprecated**: use **Sonner**.
- The `size-*` utility replaces paired `w-* h-*` classes.
- The Form docs now centre on the `<Field>` family plus your choice of form library (Next Server Actions, React Hook Form, TanStack Form, Formisch).

### Dark mode (optional)

The docs use `next-themes`: a client `ThemeProvider` wrapper with `attribute="class"`, `defaultTheme="system"` and `enableSystem`, plus `suppressHydrationWarning` on `<html>` (dark-mode/next.mdx). This matches the `.dark` class variant. The scaffold currently uses `prefers-color-scheme` instead, and init will replace that. Whether the MVP needs dark mode at all is a design call.

## Open items handed on

- **Cache Components: on or off?** Recommendation **(inference)**: turn it on now, before any pages exist. It is the model the current docs teach, it avoids migrating later, and tag-based `updateTag` fits "publish updates Home and Archive". Cost: request-time reads (session, `now` versus cutoff) must sit inside `<Suspense>`/`connection()`. If that feels heavy, the previous model plus `revalidatePath` is fully supported.
- **Upload path**: the 1 MB Server Action limit versus 10 photos. Belongs to the storage ticket.
- **shadcn init choices**: base (Radix or Base UI), preset/base colour and style are one-way decisions. Settle them in the design-approach ticket before running `init`.
