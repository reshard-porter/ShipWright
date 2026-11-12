export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <path
        d="M16 6v14M16 6l7 12h-7"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M8 22h16l-3 4H11z" fill="var(--accent)" />
    </svg>
  );
}
