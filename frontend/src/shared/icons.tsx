import type { ReactNode, SVGProps } from 'react'

// Inline stroke icons, 2px, Lucide-style (PLAN.md 4.1). Paths follow the design reference.

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function icon(paths: ReactNode, defaults: { strokeWidth?: number } = {}) {
  return function Icon({ size = 20, strokeWidth = defaults.strokeWidth ?? 2, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {paths}
      </svg>
    )
  }
}

export const SproutIcon = icon(
  <>
    <path d="M12 21V11" />
    <path d="M12 11C8 11 5 8 5 4c4 0 7 3 7 7z" />
    <path d="M12 11c4 0 7-3 7-7-4 0-7 3-7 7z" />
  </>,
  { strokeWidth: 1.9 },
)

export const FileIcon = icon(
  <>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
  </>,
)

export const UsersIcon = icon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.1a4 4 0 0 1 0 7.8" />
  </>,
)

export const UserIcon = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </>,
)

export const UserPlusIcon = icon(
  <>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
    <path d="M19 8v6" />
    <path d="M16 11h6" />
  </>,
)

export const BellIcon = icon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </>,
)

export const AlertIcon = icon(
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
)

export const PhoneIcon = icon(
  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
)

export const CheckIcon = icon(<path d="M5 12l5 5L20 7" />, { strokeWidth: 3 })

export const ArrowUpIcon = icon(
  <>
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </>,
)

export const ArrowRightIcon = icon(
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>,
)

export const CloseIcon = icon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
)

export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />, { strokeWidth: 2.2 })

export const LogOutIcon = icon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </>,
)

export const MessageIcon = icon(
  <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.4 8.4 0 0 1 8.5 8z" />,
)

export const InboxIcon = icon(
  <>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
  </>,
)

export const LightbulbIcon = icon(
  <>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
  </>,
)

export const BookIcon = icon(
  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
)

export const ChartIcon = icon(
  <>
    <path d="M3 3v18h18" />
    <path d="M7 15v2" />
    <path d="M12 10v7" />
    <path d="M17 6v11" />
  </>,
)

export const ExclamationIcon = icon(
  <>
    <path d="M12 8v5" />
    <path d="M12 17h.01" />
  </>,
  { strokeWidth: 3 },
)

export const InfoIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>,
)

export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />)

export const StarIcon = icon(
  <path d="M12 3l1.9 5.8L20 9.3l-4.7 3.9 1.5 6L12 16l-4.8 3.2 1.5-6L4 9.3l6.1-.5z" />,
)

export const ForwardIcon = icon(
  <>
    <path d="m15 17 5-5-5-5" />
    <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
  </>,
)

export const PlusIcon = icon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
  { strokeWidth: 2.4 },
)

export const ChatSquareIcon = icon(
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  { strokeWidth: 2.4 },
)

// Test mode (design reference screen 10). Play and pause are filled.
export const PlayIcon = icon(<path d="M7 4v16l13-8z" fill="currentColor" stroke="none" />)

export const PauseIcon = icon(
  <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" stroke="none" />,
)

export const ResetIcon = icon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </>,
  { strokeWidth: 2.2 },
)

export const ShieldCheckIcon = icon(
  <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </>,
  { strokeWidth: 2.4 },
)
