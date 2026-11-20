"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-4">
      <div className="label text-danger">Error</div>
      <h1 className="text-xl font-semibold">Something failed while reading the chain.</h1>
      <p className="text-sm text-muted break-all num">{error.message.split("\n")[0].slice(0, 240)}</p>
      <button type="button" onClick={reset} className="btn">
        Retry
      </button>
    </div>
  );
}
