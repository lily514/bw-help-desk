import { SproutIcon } from './icons'

/** Sprout in a green rounded square. Corner radius scales with size, as in the design. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="logo"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.33) }}
      aria-hidden="true"
    >
      <SproutIcon size={Math.round(size * 0.52)} />
    </span>
  )
}
