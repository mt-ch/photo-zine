// PROTOTYPE — throwaway placeholder data standing in for a published zine's Selection.

export type ProtoPhoto = {
  id: string;
  // width / height ratio — stands in for the real photo's natural aspect ratio
  aspect: number;
  hue: number;
  credit: { name: string; handle: string };
  caption?: string;
};

export const theme = "Concrete & Light";

export const issueNumber = 14;

export const photos: ProtoPhoto[] = [
  { id: "p1", aspect: 3 / 2, hue: 210, credit: { name: "Maya Torres", handle: "@mayashoots" }, caption: "Stairwell, 7am" },
  { id: "p2", aspect: 2 / 3, hue: 20, credit: { name: "Jonas Weiss", handle: "@jweiss.photo" } },
  { id: "p3", aspect: 1, hue: 160, credit: { name: "Priya Nair", handle: "@priya.frames" }, caption: "Untitled" },
  { id: "p4", aspect: 4 / 3, hue: 40, credit: { name: "Maya Torres", handle: "@mayashoots" } },
  { id: "p5", aspect: 3 / 4, hue: 280, credit: { name: "Sam Okafor", handle: "@sam.o" }, caption: "Underpass, west side" },
  { id: "p6", aspect: 16 / 9, hue: 350, credit: { name: "Dee Park", handle: "@deeparkpics" } },
  { id: "p7", aspect: 2 / 3, hue: 190, credit: { name: "Jonas Weiss", handle: "@jweiss.photo" }, caption: "Reflection" },
  { id: "p8", aspect: 1, hue: 60, credit: { name: "Priya Nair", handle: "@priya.frames" } },
  { id: "p9", aspect: 3 / 2, hue: 300, credit: { name: "Sam Okafor", handle: "@sam.o" } },
  { id: "p10", aspect: 4 / 5, hue: 10, credit: { name: "Dee Park", handle: "@deeparkpics" }, caption: "Late shift" },
  { id: "p11", aspect: 5 / 4, hue: 130, credit: { name: "Maya Torres", handle: "@mayashoots" } },
  { id: "p12", aspect: 2 / 3, hue: 220, credit: { name: "Priya Nair", handle: "@priya.frames" } },
];

export const contributors = Array.from(
  new Map(photos.map((p) => [p.credit.handle, p.credit])).values(),
);
