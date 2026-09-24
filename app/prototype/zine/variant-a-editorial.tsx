// PROTOTYPE — Variant A: Editorial. One full-bleed photo per "spread",
// credit set as a small caption line beneath each, big magazine-style cover.

import { PlaceholderPhoto } from "./placeholder-photo";
import { contributors, issueNumber, photos, theme } from "./data";

export function VariantA() {
  return (
    <div className="bg-white text-black">
      <header className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center border-b border-black/10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-black/50">
          Issue {issueNumber}
        </p>
        <h1 className="max-w-2xl text-5xl sm:text-7xl font-serif tracking-tight">
          {theme}
        </h1>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col">
        {photos.map((photo, i) => (
          <figure key={photo.id} className="border-b border-black/5 py-10">
            <PlaceholderPhoto photo={photo} className="w-full" />
            <figcaption className="mt-3 flex items-baseline justify-between px-1 font-mono text-xs text-black/60">
              <span>
                {photo.caption ? `“${photo.caption}”` : `Plate ${i + 1}`}
              </span>
              <span>
                {photo.credit.name} · {photo.credit.handle}
              </span>
            </figcaption>
          </figure>
        ))}
      </main>

      <footer className="border-t border-black/10 px-6 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-black/50">
          Contributors
        </p>
        <p className="mt-4 text-lg font-serif">
          {contributors.map((c) => c.name).join(" · ")}
        </p>
      </footer>
    </div>
  );
}
