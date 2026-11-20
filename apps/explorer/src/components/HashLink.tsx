import Link from "next/link";
import { Copyable } from "./Copyable";
import { truncateHash } from "@/lib/format";

type Kind = "tx" | "address" | "block";

export function HashLink({
  value,
  kind,
  full = false,
  copy = true,
  label,
  className = "",
  head,
  tail,
}: {
  value: string;
  kind: Kind;
  full?: boolean;
  copy?: boolean;
  label?: string;
  className?: string;
  head?: number;
  tail?: number;
}) {
  const href = kind === "tx" ? `/tx/${value}` : kind === "address" ? `/address/${value}` : `/block/${value}`;
  const text = label ?? (full ? value : truncateHash(value, head, tail));
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <Link href={href} title={value} className={`link num text-[13px] ${full ? "break-all" : "truncate"}`}>
        {text}
      </Link>
      {copy && <Copyable value={value} />}
    </span>
  );
}

export function PlainHash({ value, full = false, copy = true, className = "" }: { value: string; full?: boolean; copy?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <span title={value} className={`num text-[13px] ${full ? "break-all" : "truncate"}`}>
        {full ? value : truncateHash(value)}
      </span>
      {copy && <Copyable value={value} />}
    </span>
  );
}
