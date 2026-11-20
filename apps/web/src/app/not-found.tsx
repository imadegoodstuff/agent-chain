import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Not found — AGENT CHAIN" },
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="container-site flex min-h-[70vh] flex-col items-start justify-center pt-24">
      <div className="label-amber mb-4">404</div>
      <h1 className="h-display text-4xl">No block at this height.</h1>
      <p className="mt-3 text-muted">The page you asked for does not exist.</p>
      <Link href="/" className="btn-ghost mt-8">
        Back to home
      </Link>
    </div>
  );
}
