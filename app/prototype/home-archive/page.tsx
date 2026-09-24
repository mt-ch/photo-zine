// PROTOTYPE — throwaway. Three variants of Home and Archive, switchable via
// ?variant=, on the throwaway route /prototype/home-archive.

import { Suspense } from "react";
import { Root } from "./root";

export default function HomeArchivePrototypePage() {
  return (
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  );
}
