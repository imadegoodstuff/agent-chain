import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { NOT_FOUND_TITLE } from "@/lib/config";

export const metadata: Metadata = {
  title: { absolute: NOT_FOUND_TITLE },
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-6">
      <div className="label text-amber">404</div>
      <h1 className="text-2xl font-semibold tracking-tight">Not found.</h1>
      <p className="text-sm text-muted">
        This route does not resolve to a block, transaction or address. Check the hash or search again.
      </p>
      <SearchBox autoFocus />
      <Link href="/" className="btn">
        Back to explorer
      </Link>
    </div>
  );
}
