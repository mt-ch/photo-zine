// PROTOTYPE — stands in for a real <Image>; colour + aspect ratio only.

import type { ProtoPhoto } from "./data";

export function PlaceholderPhoto({
  photo,
  className = "",
}: {
  photo: ProtoPhoto;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center text-white/70 text-xs font-mono ${className}`}
      style={{
        aspectRatio: photo.aspect,
        backgroundColor: `hsl(${photo.hue} 35% 55%)`,
      }}
    >
      {photo.id}
    </div>
  );
}
