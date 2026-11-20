import { SearchBox } from "@/components/SearchBox";
import { LiveHome } from "@/components/LiveHome";
import { getHead } from "@/lib/chain-data";
import { CHAIN_NAME, networkBadgeLabel } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await getHead();
  return (
    <div className="space-y-8">
      <section className="relative pt-6 pb-2">
        <div className="absolute inset-x-0 -top-6 h-64 grid-bg pointer-events-none" aria-hidden />
        <div className="relative max-w-3xl">
          <div className="label text-amber mb-3">00 / {CHAIN_NAME}</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-bone">
            Blockspace priced in Anthropic.
          </h1>
          <p className="mt-2 text-sm text-muted">
            {networkBadgeLabel()} · 250 ms blocks · first-come-first-served · every account is a human&apos;s agent.
          </p>
          <div className="mt-5">
            <SearchBox />
          </div>
        </div>
      </section>

      <LiveHome initial={initial} />
    </div>
  );
}
