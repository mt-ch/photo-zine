// PROTOTYPE — Variant C: Photo essay. Alternating image/text rows, credit
// and caption sit inline beside the photo, contributors close as a colophon.

import { PlaceholderPhoto } from "./placeholder-photo";
import { contributors, issueNumber, photos, theme } from "./data";

export function VariantC() {
  return (
    <div className="bg-[#f4f1ea] text-black">
      <header className="mx-auto max-w-4xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-black/50">
          Issue {issueNumber}
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-serif">{theme}</h1>
        <p className="mt-6 max-w-lg text-black/70 leading-relaxed">
          Twelve photographs submitted to this issue&apos;s theme, arranged
          here as a single continuous essay.
        </p>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-16 px-6 pb-20">
        {photos.map((photo, i) => {
          const reversed = i % 2 === 1;
          return (
            <div
              key={photo.id}
              className={`flex flex-col gap-6 sm:gap-10 sm:items-center ${
                reversed ? "sm:flex-row-reverse" : "sm:flex-row"
              }`}
            >
              <PlaceholderPhoto photo={photo} className="w-full sm:w-2/3" />
              <div className="sm:w-1/3">
                <p className="font-mono text-[11px] text-black/40">
                  {String(i + 1).padStart(2, "0")}
                </p>
                {photo.caption && (
                  <p className="mt-1 font-serif text-lg leading-snug">
                    {photo.caption}
                  </p>
                )}
                <p className="mt-2 text-sm text-black/60">
                  {photo.credit.name} · {photo.credit.handle}
                </p>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="border-t border-black/10 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-black/50">
            Colophon — Contributors
          </p>
          <ol className="mt-4 columns-2 sm:columns-3 gap-4 text-sm text-black/70">
            {contributors.map((c) => (
              <li key={c.handle} className="mb-1">
                {c.name} <span className="text-black/40">{c.handle}</span>
              </li>
            ))}
          </ol>
        </div>
      </footer>
    </div>
  );
}
