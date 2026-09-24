// PROTOTYPE — throwaway placeholder data standing in for issues and the archive.

export type ProtoSwatch = { id: string; aspect: number; hue: number };

const ASPECTS = [3 / 2, 2 / 3, 1, 4 / 3, 3 / 4, 16 / 9, 4 / 5, 5 / 4];

function swatches(seed: number, count: number): ProtoSwatch[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${seed}-${i}`,
    aspect: ASPECTS[(seed + i) % ASPECTS.length],
    hue: (seed * 47 + i * 29) % 360,
  }));
}

// The issue currently open for submissions.
export const openIssue = {
  number: 15,
  theme: "Concrete & Light",
  cutoff: "2026-10-02T18:00:00Z",
};

// Stands in for the "gap" state: the previous issue closed and the admin
// hasn't opened a new one yet.
export const gapIssue = {
  lastTheme: "Static & Motion",
  lastClosedAt: "2026-09-20T18:00:00Z",
};

export const latestZine = {
  number: 14,
  theme: "Concrete & Light",
  publishedAt: "2026-09-14",
  photos: swatches(14, 6),
};

export const archive = [
  { number: 14, theme: "Concrete & Light", publishedAt: "2026-09-14", cover: swatches(14, 4) },
  { number: 13, theme: "Static & Motion", publishedAt: "2026-09-07", cover: swatches(13, 4) },
  { number: 12, theme: "Borrowed Light", publishedAt: "2026-08-31", cover: swatches(12, 4) },
  { number: 11, theme: "After Hours", publishedAt: "2026-08-24", cover: swatches(11, 4) },
  { number: 10, theme: "Interiors", publishedAt: "2026-08-17", cover: swatches(10, 4) },
  { number: 9, theme: "Street Grammar", publishedAt: "2026-08-10", cover: swatches(9, 4) },
];
