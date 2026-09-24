# Bot protection for the Submit form: Cloudflare Turnstile on Vercel

Research for [#5](https://github.com/mt-ch/photo-zine/issues/5) (map: [#1](https://github.com/mt-ch/photo-zine/issues/1)). Sources checked 2026-09-24.

**Question:** What does it take to protect the public Submit form with Cloudflare Turnstile (free tier) in a Next.js 16 app on Vercel? That covers widget setup, server-side token checking in a Server Action, limits, and the privacy note for the About page. Are there simpler free alternatives?

## Answer in brief

- **Keep Turnstile plus the hidden trap field, as already agreed.** Turnstile's free plan has no request limits, doesn't need Cloudflare in front of the site, and has no npm dependency. It is one `<script>` tag, one `<div>`, and one `fetch` to `siteverify` inside the Server Action.
- **Vercel BotID (Basic) is the only serious "simpler" alternative.** It's free on every plan, invisible, needs no keys, and supports Server Actions out of the box. But the free Basic level only "catches many less sophisticated bots". The stronger Deep Analysis costs money and needs the Pro plan. It also ties bot protection to Vercel. It works as a fallback, not as a better default.
- **Optional free extra:** one Vercel WAF rate-limit rule on the Submit path. Hobby allows 1 rate-limit rule per project.
- **Privacy:** Turnstile processes the visitor's IP, TLS fingerprint, User-Agent and the sitekey/origin. It may set strictly-necessary Cloudflare cookies. Cloudflare acts as processor, and as controller only for improving bot detection. It does not read form entries, and it isn't used for ads or profiling. The About page should say this in one sentence and link Cloudflare's Turnstile privacy addendum.

## 1. Turnstile: what you get on the free plan

| Item | Free | Source |
|---|---|---|
| Widgets | Up to 20 | [Plans][plans] |
| Hostnames per widget | 10 | [Plans][plans] |
| Challenges / siteverify calls | Unlimited | [Plans][plans] |
| Analytics retention | 7 days | [Plans][plans] |
| Remove Cloudflare branding | No (Enterprise only) | [Plans][plans] |
| Ephemeral IDs (device fingerprint in siteverify) | No (Enterprise only) | [Plans][plans], [Server-side validation][ssv] |

- It works without Cloudflare's CDN: "Turnstile can be embedded into any website without sending traffic through Cloudflare." ([Overview][overview])
- Widget modes: **Managed** (recommended; shows a checkbox only if the visitor looks risky), **Non-interactive**, and **Invisible**. ([Overview][overview])
- Accessibility: "Turnstile is WCAG 2.2 AA compliant." ([Overview][overview])
- Hostnames: each entry is an FQDN, and "the widget will work on that exact hostname and all of its subdomains". Wildcards are **not** supported. ([Hostname management][hostnames])
  - Consequence for Vercel previews: random `*.vercel.app` preview URLs can't be allow-listed one by one. Adding `vercel.app` as a hostname would allow every Vercel site. **Use Cloudflare's test keys in Development and Preview**, and real keys only in Production.

## 2. Client side (the Submit page)

From [Client-side rendering][csr] and [Widget configurations][config]:

- Load `https://challenges.cloudflare.com/turnstile/v0/api.js` from that exact URL: "Proxying or caching this file will cause Turnstile to fail."
- **Implicit rendering:** put `<div class="cf-turnstile" data-sitekey="…">` inside the `<form>`. The script finds it by class name.
- **Explicit rendering:** use `?render=explicit` and call `turnstile.render()` yourself. This fits a React client component better.
- Inside a form, Turnstile automatically adds a hidden input named **`cf-turnstile-response`** (`response-field` defaults to `true`). So a plain `<form action={serverAction}>` receives the token in its `FormData` with no extra wiring.
- `refresh-expired` defaults to `auto`, so the token refreshes itself on expiry. That matters here because tokens last 5 minutes and picking 10 photos can take longer.
- Useful options: `data-action="submit"` (max 32 chars) tags analytics and comes back from siteverify. `theme`, `size` (`normal`/`flexible`/`compact`) and `appearance` (`always`/`execute`/`interaction-only`) control how it looks. `callback` / `expired-callback` / `error-callback` can enable or disable the submit button.
- There is no first-party React package; Cloudflare's docs don't mention one. For Next.js, either use `next/script` with the implicit `<div>`, or write a small client component that calls `turnstile.render()`. A community wrapper isn't needed.
- **CSP** (only if we add one): `script-src https://challenges.cloudflare.com` and `frame-src https://challenges.cloudflare.com`. A nonce-based CSP is recommended. ([CSP][csp])

Env vars: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public, inlined at build) and `TURNSTILE_SECRET_KEY` (server only).

## 3. Server side (inside the Server Action)

From [Server-side validation][ssv]:

- `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` and `response` (both required). `remoteip` and `idempotency_key` (a UUID, for safe retries) are optional.
- Token facts: max 2048 chars; **valid for 300 s**; **single use**. A second check returns `timeout-or-duplicate`.
- Response: `success`, `challenge_ts`, `hostname`, `error-codes`, `action`, `cdata`.
- Server-side validation is mandatory. The widget on its own proves nothing. ([CSR][csr])

Sketch of the check, run before any other work in the Submit action:

```ts
'use server'
import { headers } from 'next/headers'

async function verifyTurnstile(token: FormDataEntryValue | null) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false
  const ip = (await headers()).get('x-real-ip') ?? undefined
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    }),
  })
  const data = await res.json()
  return data.success === true && data.action === 'submit' // optionally also check data.hostname
}
```

- On Vercel, `x-real-ip` / `x-forwarded-for` hold the client IP. Vercel overwrites them and doesn't pass through external values, "to prevent IP spoofing". ([Vercel request headers][headers])
- Server Actions have their own CSRF check: Next.js compares the `Origin` host with the app host and rejects mismatches. ([Next.js `serverActions` config](../node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md), bundled docs)
- **Interaction with photo uploads (for the storage ticket):** Server Action bodies are capped at **1 MB by default** (`serverActions.bodySizeLimit`, [bundled Next.js docs](../node_modules/next/dist/docs/01-app/02-guides/server-actions.md)). So 10 photos will almost certainly go straight to storage, not through the action. Because a Turnstile token is **single use**, check it at exactly one gate. Either check it where the upload URLs are handed out and carry a short-lived server-side marker through to the final submit, or check it only at final submit and rate-limit the upload-URL step separately. Decide this with the storage design.

### Testing

Dummy keys from [Testing][testing]:

| Sitekey | Behaviour |
|---|---|
| `1x00000000000000000000AA` | always passes (visible) |
| `2x00000000000000000000AB` | always fails (visible) |
| `1x00000000000000000000BB` / `2x00000000000000000000BB` | pass / fail (invisible) |
| `3x00000000000000000000FF` | forces an interactive challenge |

| Secret | Behaviour |
|---|---|
| `1x0000000000000000000000000000000AA` | always passes |
| `2x0000000000000000000000000000000AA` | always fails |
| `3x0000000000000000000000000000000AA` | "token already spent" |

The test sitekeys produce the dummy token `XXXX.DUMMY.TOKEN.XXXX`. Test secrets accept only that dummy token, and production secrets reject it. That makes `verifyTurnstile` easy to unit-test in Vitest by mocking `fetch`.

## 4. Privacy (for the About page)

- **Data processed:** "client IP address, TLS Fingerprint, User-Agent Header and Sitekey and associated origin". Cloudflare says it "does not have the ability to directly identify any individuals" from these. ([Turnstile Privacy Addendum][privacy])
- **Purpose:** "not to identify, profile or target any individuals but solely to detect and block bots". ([Privacy Addendum][privacy])
- **GDPR role:** processor when protecting our site; controller (legitimate interests) when improving its bot detection. ([Privacy Addendum][privacy])
- **Form contents:** Turnstile "does not access, store, or transmit user communications, form entries, or other page inputs." ([Overview][overview])
- **Cookies:** Cloudflare's cookie policy lists CAPTCHA cookies (`cf_clearance`, `cf_chl_rc_i`, `cf_chl_rc_ni`) and bot cookies (`__cf_bm`) as **strictly necessary**. Strictly necessary cookies generally don't need a consent banner, but they should still be disclosed. ([Cookie Policy][cookies])
- Retention and international transfers are **not** covered in the addendum. Cloudflare's main privacy policy and DPA cover those. Don't invent a retention period on the About page.

Suggested About-page line: *"The submission form is protected by Cloudflare Turnstile to block spam bots. Turnstile processes technical data such as your IP address and browser details, and may set strictly necessary cookies, solely to tell humans from bots. It does not see what you type into the form. See Cloudflare's [Turnstile privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/)."*

## 5. Alternatives considered

### Vercel BotID

From the [BotID docs][botid], [Get started][botid-start], [Form submissions][botid-forms] and [Local development][botid-dev]:

- An invisible challenge that "never renders a visible element". Setup:
  1. `pnpm i botid`
  2. `withBotId(nextConfig)` in `next.config.ts`
  3. `initBotId({ protect: [{ path: '/submit', method: 'POST' }] })` in `instrumentation-client.ts` (Next.js 15.3+). Server Actions are protected by the path of the **page** that calls them.
  4. `const { isBot } = await checkBotId()` in the action.
- **Pricing:** Basic is free on all plans. Deep Analysis (Kasada ML) is Pro-only at $1 per 1,000 `checkBotId()` calls. Basic only "validates the integrity and correctness of the challenge response, catching many less sophisticated bots."
- **Constraints:** Vercel-hosted only. Native HTML form posts (`action="/api/…" method="POST"`) aren't supported, but a Server Action passed to `<form action={fn}>` is. `curl` requests to a protected route are blocked in production. In local dev `checkBotId()` always returns `isBot: false`, unless you set `developmentOptions.bypass`.
- **Verdict:** less setup (no keys, no widget, no hostname list, no visible UI), but weaker for free and locked to Vercel. Vercel's own [comparison][botid-vs-ts] points to Turnstile for "free drop-in widgets". If the Turnstile widget turns out to be ugly or annoying next to the zine design, BotID Basic plus the trap field plus the rate-limit rule is a reasonable fallback.

### Vercel Firewall (free parts)

- **Bot protection managed ruleset:** sends a JavaScript challenge to non-browser traffic, for example `curl` pretending to be Chrome. It is off by default and has log or challenge modes. It doesn't work behind a reverse proxy. It works at site level, not per form, so it adds to form protection rather than replacing it. ([Bot management][botmgmt])
- **WAF rate limiting:** Hobby gets **1 rate-limit rule per project** (3 custom rules in total), a fixed window of 10 s to 10 min, keyed on IP or JA4, with 1,000,000 allowed requests included. ([Rate limiting][ratelimit]) One rule on `POST` to the Submit path, e.g. 5 per 10 min per IP, is a cheap backstop for token farms.

### Honeypot (hidden trap field)

This is already in the plan. It costs nothing, has no privacy impact and needs no dependency. It only stops naive bots, so it complements Turnstile rather than replacing it.

## Recommendation

1. Turnstile in **Managed** mode, implicit `<div class="cf-turnstile">` inside the Submit `<form>` with `data-action="submit"`. Test keys in Development and Preview, real keys in Production (hostnames: the production domain, which also covers its subdomains).
2. `verifyTurnstile()` as the first step of the Submit Server Action: check `success`, `action` and `hostname`. Pass `remoteip` from `x-real-ip`.
3. Keep the hidden trap field. Reject silently if it's filled.
4. Optional: one Hobby WAF rate-limit rule on the Submit path.
5. Add the one-line Turnstile privacy note to the About page.
6. Open item for the storage/upload ticket: where the single-use token is checked, given that photos probably upload straight to storage.

[plans]: https://developers.cloudflare.com/turnstile/plans/
[overview]: https://developers.cloudflare.com/turnstile/
[csr]: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
[config]: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/
[ssv]: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
[testing]: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
[hostnames]: https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/
[csp]: https://developers.cloudflare.com/turnstile/reference/content-security-policy/
[privacy]: https://www.cloudflare.com/turnstile-privacy-policy/
[cookies]: https://www.cloudflare.com/cookie-policy/
[headers]: https://vercel.com/docs/headers/request-headers
[botid]: https://vercel.com/docs/botid
[botid-start]: https://vercel.com/docs/botid/get-started
[botid-forms]: https://vercel.com/docs/botid/form-submissions
[botid-dev]: https://vercel.com/docs/botid/local-development-behavior
[botid-vs-ts]: https://vercel.com/kb/guide/vercel-botid-vs-cloudflare-turnstile
[botmgmt]: https://vercel.com/docs/bot-management
[ratelimit]: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
