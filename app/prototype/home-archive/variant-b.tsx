// PROTOTYPE — Variant B: Split canvas. A fixed info sidebar sits beside a
// static preview of the latest zine's staggered grid (echoing the zine
// layout prototype). Archive is a masonry of collage cover tiles.

import { archive, gapIssue, latestZine, openIssue } from "./data";
import { Swatch } from "./swatch";

export function HomeVariantB({ issueState }: { issueState: "open" | "gap" }) {
  return (
    <div className="flex min-h-screen bg-white text-black">
      <aside className="flex w-full max-w-xs flex-col justify-between border-r border-black/10 p-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-black/40">
            {issueState === "open" ? `Issue ${openIssue.number}` : "No open issue"}
          </p>
          <h1 className="mt-3 text-4xl font-medium leading-tight">
            {issueState === "open" ? openIssue.theme : gapIssue.lastTheme}
          </h1>
        </div>

        <div className="mt-10 space-y-6">
          {issueState === "open" ? (
            <>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-black/40">
                  Cutoff
                </p>
                <p className="mt-1 text-sm">
                  {new Date(openIssue.cutoff).toLocaleString()}
                </p>
              </div>
              <a
                href="#"
                className="block rounded-full bg-black px-5 py-3 text-center font-mono text-xs uppercase tracking-widest text-white"
              >
                Submit your photos
              </a>
            </>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-widest text-black/40">
              Next issue not yet open — last closed{" "}
              {new Date(gapIssue.lastClosedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </aside>

      <div className="relative flex-1 overflow-hidden bg-white">
        <p className="pointer-events-none absolute left-6 top-6 font-mono text-[11px] uppercase tracking-widest text-black/40">
          Latest zine — {latestZine.theme}
        </p>
        <div className="grid h-full grid-cols-3 gap-6 p-10 pt-20">
          {latestZine.photos.map((p, i) => (
            <Swatch
              key={p.id}
              swatch={p}
              className={i % 2 === 1 ? "mt-10 self-start" : "self-start"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ArchiveVariantB() {
  return (
    <div className="min-h-screen bg-white px-8 py-16 text-black">
      <p className="mb-10 font-mono text-xs uppercase tracking-widest text-black/40">
        Archive
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {archive.map((issue) => (
          <div
            key={issue.number}
            className="group relative overflow-hidden rounded-lg border border-black/10"
          >
            <div className="grid grid-cols-2 grid-rows-2">
              {issue.cover.map((s) => (
                <Swatch key={s.id} swatch={s} className="h-full w-full" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <p className="font-mono text-[11px] uppercase tracking-widest text-white/70">
                Issue {issue.number}
              </p>
              <p className="text-lg font-medium text-white">{issue.theme}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
