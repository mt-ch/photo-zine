// PROTOTYPE — Variant C: Editorial index. Reads like a masthead/table of
// contents — mono stat rows, an understated text CTA, no hero imagery.
// Archive is a dense text-only index with a hover-reveal thumbnail.

import { archive, gapIssue, latestZine, openIssue } from "./data";
import { Swatch } from "./swatch";

export function HomeVariantC({ issueState }: { issueState: "open" | "gap" }) {
  return (
    <div className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-black/40">
          Photo Zine
        </p>
        <h1 className="mt-4 text-5xl font-medium leading-tight sm:text-6xl">
          {issueState === "open" ? openIssue.theme : gapIssue.lastTheme}
        </h1>

        <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-black/10 py-4 font-mono text-xs">
          <div>
            <dt className="text-black/40">Issue</dt>
            <dd className="mt-1">
              {issueState === "open" ? openIssue.number : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-black/40">Status</dt>
            <dd className="mt-1">
              {issueState === "open" ? "Open" : "Between issues"}
            </dd>
          </div>
          <div>
            <dt className="text-black/40">Cutoff</dt>
            <dd className="mt-1">
              {issueState === "open"
                ? new Date(openIssue.cutoff).toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          {issueState === "open" ? (
            <a href="#" className="text-sm underline underline-offset-4">
              Submit your photos to this issue &rarr;
            </a>
          ) : (
            <p className="font-mono text-xs text-black/40">
              Not accepting submissions right now
            </p>
          )}
        </div>

        <div className="mt-16">
          <p className="font-mono text-[11px] uppercase tracking-widest text-black/40">
            Last published — Issue {latestZine.number}, {latestZine.theme}
          </p>
          <div className="mt-3 flex gap-1.5">
            {latestZine.photos.slice(0, 5).map((p) => (
              <Swatch key={p.id} swatch={p} className="h-14 flex-1" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArchiveVariantC() {
  return (
    <div className="min-h-screen bg-white px-6 py-16 text-black">
      <div className="mx-auto max-w-2xl">
        <p className="mb-10 font-mono text-xs uppercase tracking-widest text-black/40">
          Archive
        </p>
        <ul>
          {archive.map((issue) => (
            <li
              key={issue.number}
              className="group flex items-baseline justify-between gap-4 border-b border-black/10 py-3 font-mono text-sm"
            >
              <span className="flex gap-4">
                <span className="text-black/40">
                  {String(issue.number).padStart(2, "0")}
                </span>
                <span className="font-sans text-base">{issue.theme}</span>
              </span>
              <span className="relative flex items-center gap-3 text-black/40">
                <span className="hidden gap-1 group-hover:flex">
                  {issue.cover.slice(0, 3).map((s) => (
                    <Swatch key={s.id} swatch={s} className="h-8 w-8" />
                  ))}
                </span>
                {issue.publishedAt}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
