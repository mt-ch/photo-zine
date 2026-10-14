"use client";

import { useState } from "react";
import { pingAdmin } from "./actions";

export function PingButton() {
  const [result, setResult] = useState<string>();

  return (
    <div className="flex items-center gap-4">
      <button
        className="rounded border px-3 py-1"
        onClick={async () => {
          const res = await pingAdmin();
          setResult("error" in res ? `Denied: ${res.error}` : "Action succeeded");
        }}
      >
        Run stub admin action
      </button>
      {result && <span>{result}</span>}
    </div>
  );
}
