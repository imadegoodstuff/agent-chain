import type { Metadata } from "next";
import { Build } from "@/components/sections/Build";
import { Accordion, faqItems } from "@/components/sections/FAQ";
import { Markdown } from "@/components/docs/Markdown";
import { CopyButton } from "@/components/ui/CopyButton";
import { readDocWithFallback } from "@/lib/docs";
import { getLang } from "@/lib/lang";
import { contractAddresses } from "@/lib/deployments";
import { DISCLAIMERS, EXPLORER_URL, NETWORKS, TOKENS } from "@/lib/spec";
import { BSC_CONTRACT_ROWS, BSC_DEPLOYED_AT, BSC_OWNER, BSC_OWNER_PERMISSIONS, bscAddr, bscCode } from "@/lib/bsc";
import { fmtInt } from "@/lib/format";
import { ArrowUpRight, ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "Builders",
  description: "Build on AGENT CHAIN Devnet: chain ID 11190, RPC, explorer, Foundry / Hardhat / viem config, contracts and FAQ.",
};

export default async function BuildersPage() {
  const lang = await getLang();
  const faqDoc = readDocWithFallback("faq", lang);
  const contracts = contractAddresses();
  return (
    <>
      <div className="container-site pt-28 md:pt-36">
        <div className="label-amber">Builders</div>
        <h1 className="h-display mt-3 max-w-3xl text-4xl md:text-5xl">Standard EVM, 250 ms blocks, fees you can ignore.</h1>
        <p className="mt-5 max-w-2xl text-muted md:text-lg">
          Everything you need to point tooling at the devnet today, and what changes at Testnet and Mainnet.
          {" "}
          {DISCLAIMERS.devnet}
        </p>
      </div>

      <section id="mainnet-contracts" className="container-site mt-16 scroll-mt-20">
        <div className="label-amber mb-6 flex flex-wrap items-center gap-3">
          <span>BSC MAINNET CONTRACTS</span>
          <span className="text-line">/</span>
          <span className="inline-flex items-center gap-1.5 text-green">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-green" /> LIVE · CHAIN 56 · DEPLOYED {BSC_DEPLOYED_AT}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-2/70">
              <tr>
                {["Contract", "Address", "BscScan", "Purpose"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-mono text-[11px] font-normal uppercase tracking-label text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface">
              {BSC_CONTRACT_ROWS.map((c) => (
                <tr key={c.name} className="border-t border-line/70 align-top">
                  <td className="px-5 py-3 font-medium text-bone">
                    {c.name}
                    <div className="mt-1 font-mono text-[11px] font-normal text-muted">block #{fmtInt(c.deployBlock)}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-bone/90">
                    <span className="inline-flex items-center gap-2">
                      <span className="break-all">{c.address}</span>
                      <CopyButton value={c.address} />
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px]">
                    <a href={bscCode(c.address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline">
                      verified source <ArrowUpRight size={11} />
                    </a>
                  </td>
                  <td className="px-5 py-3 text-muted">{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted">
          Owner of all three: deployer EOA{" "}
          <a href={bscAddr(BSC_OWNER)} target="_blank" rel="noreferrer" className="text-bone hover:text-amber">
            {BSC_OWNER}
          </a>{" "}
          · $AGENT token: not launched yet (no address) · Credentials: Agent ID {TOKENS.AGENT_ID.slice(0, 8)}… / BAB · Gas token: ANTB {TOKENS.ANTB.slice(0, 8)}…
        </p>

        <details id="owner-permissions" className="card group mt-6 scroll-mt-24 open:bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 [&::-webkit-details-marker]:hidden">
            <div>
              <div className="text-base font-medium text-bone">Owner permissions</div>
              <div className="mt-1 text-sm text-muted">
                Every privileged function, who holds it, and why. Nothing lets the owner mint, burn, move or reassign a registration
                or a seat, or take ANTB from a user&apos;s wallet. Mirrors contracts/bsc/README.md.
              </div>
            </div>
            <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-line">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-2/70">
                  <tr>
                    {["Contract", "Function", "Holder", "Why it exists", "Risk / mitigation"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-mono text-[11px] font-normal uppercase tracking-label text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BSC_OWNER_PERMISSIONS.map((p) => (
                    <tr key={`${p.contract}-${p.fn}`} className="border-t border-line/70 align-top">
                      <td className="px-5 py-3 font-mono text-[12px] text-bone/90">{p.contract}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-amber">{p.fn}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-muted">owner</td>
                      <td className="px-5 py-3 text-muted">{p.why}</td>
                      <td className="px-5 py-3 text-muted">{p.risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 py-4 text-xs leading-relaxed text-muted">
              The owner is the AGENT CHAIN deployer EOA at launch and is intended to move to a multisig before the bridge caps are
              lifted (Phase 4). The Beta bridge holds funds in a contract whose owner can move them (withdrawTo); deposit only what
              you are prepared to have escrowed under those terms.
            </p>
          </div>
        </details>
      </section>

      <Build compact />

      <section id="network" className="container-site scroll-mt-20">
        <div className="label-amber mb-6 flex items-center gap-3">
          <span>NETWORKS</span>
          <span className="text-line">/</span>
          <span>SPEC §2</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-2/70">
              <tr>
                <th className="px-5 py-3 text-left font-mono text-[11px] font-normal uppercase tracking-label text-muted"></th>
                {NETWORKS.map((n) => (
                  <th key={n.key} className="px-5 py-3 text-left font-mono text-[11px] font-normal uppercase tracking-label text-muted">
                    {n.name}
                    <span className={`ml-2 ${n.key === "devnet" ? "text-green" : "text-muted"}`}>· {n.status}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface">
              {(
                [
                  ["Chain ID", "chainId"],
                  ["RPC", "rpc"],
                  ["Explorer", "explorer"],
                  ["Gas token", "gas"],
                  ["Parent", "parent"],
                  ["Block time", "blockTime"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key} className="border-t border-line/70">
                  <td className="px-5 py-3 font-mono text-[11px] uppercase tracking-label text-muted">{label}</td>
                  {NETWORKS.map((n) => {
                    const v = n[key];
                    return (
                      <td key={n.key} className="px-5 py-3 font-mono text-[13px] text-bone/90">
                        {v.startsWith("http") ? (
                          <span className="inline-flex items-center gap-2">
                            <a href={v} target="_blank" rel="noreferrer" className="hover:text-amber">
                              {v}
                            </a>
                            <CopyButton value={v} />
                          </span>
                        ) : (
                          v
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="contracts" className="container-site mt-24 scroll-mt-20">
        <div className="label-amber mb-6 flex items-center gap-3">
          <span>CONTRACTS</span>
          <span className="text-line">/</span>
          <span>{contracts.fromFile ? "DEVNET · from deployments/devnet.json" : "DEVNET · addresses TBA until deploy"}</span>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
          {[
            {
              n: "AgentRegistry",
              a: contracts.AgentRegistry,
              d: "address → bytes32 handleHash + bool active. Owner-set mirror of BSC Agent ID state.",
              sig: "isAgent(address) view returns (bool)",
            },
            {
              n: "GenesisSeat",
              a: contracts.GenesisSeat,
              d: "Non-transferable ERC-721-like with sequential seatId. mint() once per address (devnet: open to anyone).",
              sig: "event SeatMinted(address,uint256)",
            },
            {
              n: "FeeKeeper (stub)",
              a: contracts.FeeKeeper,
              d: "Stores usdPerGas and antbUsdPrice. Emits BaseFeeUpdated.",
              sig: "usdPerGas() · antbUsdPrice()",
            },
          ].map((c) => (
            <div key={c.n} className="bg-surface p-6">
              <div className="text-base font-medium text-bone">{c.n}</div>
              <div className="mt-2 flex items-center gap-2 font-mono text-xs text-muted">
                {c.a === "TBA" ? (
                  <span>TBA</span>
                ) : (
                  <>
                    <a href={`${EXPLORER_URL}/address/${c.a}`} target="_blank" rel="noreferrer" className="truncate hover:text-amber">
                      {c.a}
                    </a>
                    <CopyButton value={c.a} />
                  </>
                )}
              </div>
              <p className="mt-3 text-sm text-muted">{c.d}</p>
              <code className="mt-3 block font-mono text-[11px] text-amber">{c.sig}</code>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
          {[
            { n: "ANTB (BEP-20, BSC)", a: TOKENS.ANTB, d: "Binance bStocks tokenized Anthropic stock · 18 decimals · gas on mainnet" },
            { n: "Binance Agent ID (ERC-721, BSC)", a: TOKENS.AGENT_ID, d: "One per KYC'd human · non-transferable · required to transact" },
          ].map((c) => (
            <div key={c.n} className="bg-surface p-6">
              <div className="label">BSC · mainnet reference</div>
              <div className="mt-2 text-base font-medium text-bone">{c.n}</div>
              <div className="mt-2 flex items-center gap-2 font-mono text-xs text-muted">
                <span className="truncate">{c.a}</span>
                <CopyButton value={c.a} />
              </div>
              <p className="mt-2 text-sm text-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="container-site mt-24 scroll-mt-20">
        <div className="label-amber mb-6">FAQ</div>
        {faqDoc.present ? <Markdown content={faqDoc.content} /> : <Accordion items={faqItems} />}
      </section>
    </>
  );
}
