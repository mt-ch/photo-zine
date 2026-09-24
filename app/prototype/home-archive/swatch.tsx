// PROTOTYPE — stands in for a real <Image>; colour + aspect ratio only.

import type { ProtoSwatch } from "./data";

export function Swatch({
  swatch,
  className = "",
}: {
  swatch: ProtoSwatch;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        aspectRatio: swatch.aspect,
        backgroundColor: `hsl(${swatch.hue} 35% 55%)`,
      }}
    />
  );
}
