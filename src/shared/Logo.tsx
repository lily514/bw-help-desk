export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 25v-9" />
        <path d="M16 16c0-4 3-7 7-7 0 4-3 7-7 7z" />
        <path d="M16 19c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z" />
      </g>
    </svg>
  )
}
