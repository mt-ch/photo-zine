// PROTOTYPE — Variant A: Full-bleed hero. The theme dominates the viewport;
// cutoff is a pill in the corner; the latest zine is a filmstrip pinned to
// the bottom edge. Archive is a plain chronological list.

import { archive, gapIssue, latestZine, openIssue } from "./data";
import { Swatch } from "./swatch";

export function HomeVariantA({ issueState }: { issueState: "open" | "gap" }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-black/40">
          {issueState === "open"
            ? `Issue ${openIssue.number} — open now`
            : "Between issues"}
        </p>
        <h1 className="mt-4 max-w-3xl text-6xl font-medium leading-[1.05] sm:text-8xl">
          {issueState === "open" ? openIssue.theme : gapIssue.lastTheme}
        </h1>

        {issueState === "open" ? (
          <div className="mt-10 flex items-center gap-4">
            <a
              href="#"
              className="rounded-full bg-black px-6 py-3 font-mono text-xs uppercase tracking-widest text-white"
            >
              Submit your photos
            </a>
            <span className="rounded-full border border-black/10 px-3 py-1 font-mono text-xs text-black/50">
              Cutoff {new Date(openIssue.cutoff).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <p className="mt-10 font-mono text-xs uppercase tracking-widest text-black/40">
            Submissions open again soon
          </p>
        )}
      </div>

      <div className="border-t border-black/10 px-6 py-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-black/40">
          Latest zine — Issue {latestZine.number}, {latestZine.theme}
        </p>
        <div className="flex gap-2 overflow-x-auto">
          {latestZine.photos.map((p) => (
            <Swatch key={p.id} swatch={p} className="h-24 flex-shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ArchiveVariantA() {
  return (
    <div className="min-h-screen bg-white px-6 py-16 text-black">
      <p className="mb-10 font-mono text-xs uppercase tracking-widest text-black/40">
        Archive
      </p>
      <ul className="mx-auto max-w-3xl divide-y divide-black/10">
        {archive.map((issue) => (
          <li
            key={issue.number}
            className="flex items-center justify-between gap-6 py-5"
          >
            <div>
              <p className="font-mono text-xs text-black/40">
                Issue {issue.number}
              </p>
              <p className="text-2xl font-medium">{issue.theme}</p>
              <p className="mt-1 font-mono text-xs text-black/40">
                {issue.publishedAt}
              </p>
            </div>
            <div className="flex gap-1.5">
              {issue.cover.map((s) => (
                <Swatch key={s.id} swatch={s} className="h-12 w-12" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
