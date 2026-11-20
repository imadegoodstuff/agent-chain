export function HexMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25L16 2.5Z" stroke="#F0B35B" strokeWidth="1.6" />
      <path d="M16 9.5 21.6 12.75v6.5L16 22.5l-5.6-3.25v-6.5L16 9.5Z" fill="#F0B35B" />
      <circle cx="16" cy="16" r="1.6" fill="#0B0C10" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <HexMark />
      <span className="font-sans text-[13px] font-semibold tracking-[0.18em] text-bone">AGENT CHAIN</span>
    </span>
  );
}
