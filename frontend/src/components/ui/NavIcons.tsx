import type { SVGProps } from 'react'

/**
 * DilGO's own menu icons: drawn for the app rather than taken from a stock set.
 * Duotone: a soft filled body (currentColor at low opacity) under a rounded 1.8px
 * outline, so they stay crisp at 20px and pick up the item's colour when active.
 */
type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p })
const soft = { fill: 'currentColor', fillOpacity: 0.18, stroke: 'none' }

export type NavIcon = (p: P) => React.JSX.Element

/** A folded map with a marked stop: the learning path. */
export const IconPath: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
    <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
    <path d="M9 4.5v13M15 6.5v13" />
    <circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

/** An open book with a ribbon. */
export const IconBook: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M3 5.5C5.5 4.5 9 4.5 12 6.5v13c-3-2-6.5-2-9-1z" />
    <path d="M3 5.5C5.5 4.5 9 4.5 12 6.5c3-2 6.5-2 9-1v13c-2.5-1-6-1-9 1-3-2-6.5-2-9-1z" />
    <path d="M12 6.5v13" />
    <path d="M16 5.2V9l1.2-.9 1.2.9V5" />
  </svg>
)

/** A speech bubble carrying a voice wave: talking with Defne. */
export const IconTalk: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M4 11.5C4 7.4 7.6 4.5 12 4.5s8 2.9 8 7-3.6 7-8 7c-1 0-2-.1-2.9-.4L5 20l1.1-3.4A6.6 6.6 0 0 1 4 11.5z" />
    <path d="M4 11.5C4 7.4 7.6 4.5 12 4.5s8 2.9 8 7-3.6 7-8 7c-1 0-2-.1-2.9-.4L5 20l1.1-3.4A6.6 6.6 0 0 1 4 11.5z" />
    <path d="M9 10.3v2.4M12 9v5M15 10.3v2.4" />
  </svg>
)

/** Two stacked flash cards: practice and review. */
export const IconCards: NavIcon = (p) => (
  <svg {...base(p)}>
    <rect x="3.5" y="7" width="12" height="13" rx="2.5" transform="rotate(-8 9.5 13.5)" />
    <rect {...soft} x="8.5" y="4" width="12" height="13" rx="2.5" />
    <rect x="8.5" y="4" width="12" height="13" rx="2.5" />
    <path d="m12 11 1.8 1.8L17.5 9" />
  </svg>
)

/** A little ghost: Gölge Düellosu. */
export const IconGhost: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M5 20V11a7 7 0 0 1 14 0v9l-2.4-1.6L14.3 20 12 18.4 9.7 20l-2.3-1.6z" />
    <path d="M5 20V11a7 7 0 0 1 14 0v9l-2.4-1.6L14.3 20 12 18.4 9.7 20l-2.3-1.6z" />
    <circle cx="9.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)

/** A cup with handles and a star: leagues. */
export const IconCup: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4.5v1.5A3 3 0 0 0 7.3 10.5M17 6h2.5v1.5a3 3 0 0 1-2.8 3" />
    <path d="M12 14v3.5M8.5 20.5h7M9.5 17.5h5" />
  </svg>
)

/** A rolled scroll with a tick: quests. */
export const IconQuest: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8" />
    <path d="M8 20a2 2 0 0 1-2-2V6a2 2 0 1 0-4 0v1.5h4" />
    <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 0 2-2v-1.5h11" />
    <path d="m9.5 10.5 1.8 1.8 3.7-3.8" />
  </svg>
)

/** A ribboned gift box: rewards. */
export const IconGift: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M5 11h14v8.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5z" />
    <rect x="3.5" y="7.5" width="17" height="3.5" rx="1.2" />
    <path d="M5 11v8.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V11M12 7.5V21" />
    <path d="M12 7.5c-1-2.8-4.6-3.4-4.6-1.2 0 1.2 2 1.2 4.6 1.2zM12 7.5c1-2.8 4.6-3.4 4.6-1.2 0 1.2-2 1.2-4.6 1.2z" />
  </svg>
)

/** A notched ticket with a perforation: partner coupons. */
export const IconTicket: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4z" />
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5V14a2 2 0 0 0 0-4z" />
    <path strokeDasharray="1.6 2" d="M15 7v10" />
  </svg>
)

/** A shopping bag with a gem tag: shop. */
export const IconBag: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M5 8h14l-1 12H6z" />
    <path d="M5 8h14l-1 12H6z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    <path d="m10.3 14 1.7-1.6 1.7 1.6-1.7 2z" />
  </svg>
)

/** A person in a soft circle: profile. */
export const IconProfile: NavIcon = (p) => (
  <svg {...base(p)}>
    <circle {...soft} cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.5 18.2c1.3-2 3.2-3 5.5-3s4.2 1 5.5 3" />
  </svg>
)

/** A school building with a flag: institution. */
export const IconSchool: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M4 10h16v10H4z" />
    <path d="M3 10.5 12 6l9 4.5M4 10v10h16V10M10 20v-4h4v4M12 6V2.5l3 1.2-3 1.2" />
    <path d="M7 13h1.5M15.5 13H17" />
  </svg>
)

/** A shield with a check: admin. */
export const IconShield: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M12 3 19.5 6v5.5c0 4.5-3.1 8-7.5 9.5-4.4-1.5-7.5-5-7.5-9.5V6z" />
    <path d="M12 3 19.5 6v5.5c0 4.5-3.1 8-7.5 9.5-4.4-1.5-7.5-5-7.5-9.5V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
)

/** Four rounded tiles: "more". */
export const IconMore: NavIcon = (p) => (
  <svg {...base(p)}>
    <rect {...soft} x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </svg>
)

/** Two sliders: settings. */
export const IconSliders: NavIcon = (p) => (
  <svg {...base(p)}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle {...soft} cx="15" cy="7" r="2.5" />
    <circle cx="15" cy="7" r="2.5" />
    <circle {...soft} cx="9" cy="17" r="2.5" />
    <circle cx="9" cy="17" r="2.5" />
  </svg>
)

/** A mortarboard with a tassel: exam prep. */
export const IconExam: NavIcon = (p) => (
  <svg {...base(p)}>
    <path {...soft} d="M12 4.5 2.5 9 12 13.5 21.5 9z" />
    <path d="M12 4.5 2.5 9 12 13.5 21.5 9z" />
    <path d="M6.5 11v4.2c0 1.6 2.5 3.3 5.5 3.3s5.5-1.7 5.5-3.3V11" />
    <path d="M21.5 9v5.5" />
    <circle cx="21.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)
