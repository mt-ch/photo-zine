// PROTOTYPE — Variant B: Mosaic. Dense CSS-columns gallery, minimal top
// banner, credit revealed as a hover/tap overlay rather than fixed caption.

import { PlaceholderPhoto } from "./placeholder-photo";
import { contributors, issueNumber, photos, theme } from "./data";

export function VariantB() {
  return (
    <div className="bg-neutral-950 text-white min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <span className="font-mono text-xs text-white/50">
          Issue {issueNumber}
        </span>
        <span className="font-sans text-sm font-medium tracking-wide">
          {theme}
        </span>
      </header>

      <main className="columns-2 sm:columns-3 gap-2 p-2">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative mb-2 break-inside-avoid">
            <PlaceholderPhoto photo={photo} className="w-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <span className="text-xs font-medium">{photo.credit.name}</span>
              {photo.caption && (
                <span className="text-[11px] text-white/70">{photo.caption}</span>
              )}
            </div>
          </div>
        ))}
      </main>

      <footer className="border-t border-white/10 p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-white/40">
          Contributors
        </p>
        <div className="flex flex-wrap gap-2">
          {contributors.map((c) => (
            <span
              key={c.handle}
              className="rounded-full border border-white/15 px-3 py-1 text-xs"
            >
              {c.handle}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
