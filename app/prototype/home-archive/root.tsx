// PROTOTYPE — throwaway. Answers "what do Home and Archive look like, and
// how does Home handle the gap between issues?" (wayfinder ticket: Home and
// Archive pages). Three variants, switchable via ?variant=; a page tab and
// an issue-state toggle sit above the variant since they're not the axis
// being judged.
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArchiveVariantA, HomeVariantA } from "./variant-a";
import { ArchiveVariantB, HomeVariantB } from "./variant-b";
import { ArchiveVariantC, HomeVariantC } from "./variant-c";
import { PrototypeSwitcher } from "./switcher";

const HOME = { A: HomeVariantA, B: HomeVariantB, C: HomeVariantC };
const ARCHIVE = { A: ArchiveVariantA, B: ArchiveVariantB, C: ArchiveVariantC };

export function Root() {
  const searchParams = useSearchParams();
  const variant = (searchParams.get("variant") ?? "A") as keyof typeof HOME;
  const [page, setPage] = useState<"home" | "archive">("home");
  const [issueState, setIssueState] = useState<"open" | "gap">("open");

  const Home = HOME[variant] ?? HomeVariantA;
  const Archive = ARCHIVE[variant] ?? ArchiveVariantA;

  return (
    <>
      <div className="fixed left-6 top-6 z-50 flex gap-2 font-mono text-xs">
        <div className="flex overflow-hidden rounded-full border border-black/10 bg-white">
          <button
            onClick={() => setPage("home")}
            className={`px-3 py-1.5 ${page === "home" ? "bg-black text-white" : "text-black/50"}`}
          >
            Home
          </button>
          <button
            onClick={() => setPage("archive")}
            className={`px-3 py-1.5 ${page === "archive" ? "bg-black text-white" : "text-black/50"}`}
          >
            Archive
          </button>
        </div>
        {page === "home" && (
          <div className="flex overflow-hidden rounded-full border border-black/10 bg-white">
            <button
              onClick={() => setIssueState("open")}
              className={`px-3 py-1.5 ${issueState === "open" ? "bg-black text-white" : "text-black/50"}`}
            >
              Open
            </button>
            <button
              onClick={() => setIssueState("gap")}
              className={`px-3 py-1.5 ${issueState === "gap" ? "bg-black text-white" : "text-black/50"}`}
            >
              Gap
            </button>
          </div>
        )}
      </div>

      {page === "home" ? <Home issueState={issueState} /> : <Archive />}

      <PrototypeSwitcher />
    </>
  );
}
