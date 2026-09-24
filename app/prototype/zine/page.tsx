// PROTOTYPE — throwaway. Answers "what does a published zine look like?"
// (wayfinder ticket: Zine layout). Three structurally different variants,
// switchable via ?variant=. Placeholder photos and credits, no real data.
// See mattpocock-skills:prototype UI.md — capture the winner, drop the rest.

import { Suspense } from "react";
import { PrototypeSwitcher } from "../_components/prototype-switcher";
import { VariantD } from "./variant-d-grid";
import { VariantE } from "./variant-e-staggered";

const variants = [
  { key: "D", name: "Infinite grid" },
  { key: "E", name: "Staggered columns" },
];

export default async function ZinePrototypePage({
  searchParams,
}: PageProps<"/prototype/zine">) {
  const params = await searchParams;
  const variantParam = params.variant;
  const variant = Array.isArray(variantParam) ? variantParam[0] : variantParam;
  const current = variants.some((v) => v.key === variant) ? variant! : "D";

  return (
    <>
      {current === "D" && <VariantD />}
      {current === "E" && <VariantE />}
      <Suspense fallback={null}>
        <PrototypeSwitcher variants={variants} current={current} />
      </Suspense>
    </>
  );
}
