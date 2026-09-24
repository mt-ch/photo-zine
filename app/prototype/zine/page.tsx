// PROTOTYPE — throwaway. Answers "what does a published zine look like?"
// (wayfinder ticket: Zine layout). Three structurally different variants,
// switchable via ?variant=. Placeholder photos and credits, no real data.
// See mattpocock-skills:prototype UI.md — capture the winner, drop the rest.

import { Suspense } from "react";
import { PrototypeSwitcher } from "../_components/prototype-switcher";
import { VariantA } from "./variant-a-editorial";
import { VariantB } from "./variant-b-mosaic";
import { VariantC } from "./variant-c-essay";

const variants = [
  { key: "A", name: "Editorial" },
  { key: "B", name: "Mosaic" },
  { key: "C", name: "Essay" },
];

export default async function ZinePrototypePage({
  searchParams,
}: PageProps<"/prototype/zine">) {
  const params = await searchParams;
  const variantParam = params.variant;
  const variant = Array.isArray(variantParam) ? variantParam[0] : variantParam;
  const current = variants.some((v) => v.key === variant) ? variant! : "A";

  return (
    <>
      {current === "A" && <VariantA />}
      {current === "B" && <VariantB />}
      {current === "C" && <VariantC />}
      <Suspense fallback={null}>
        <PrototypeSwitcher variants={variants} current={current} />
      </Suspense>
    </>
  );
}
