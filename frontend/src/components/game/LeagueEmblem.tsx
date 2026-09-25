const COLORS = ['#D98B4E', '#AEB7C8', '#FFC53D', '#3A6FF7', '#E23D78', '#2EC4A0', '#9B7BFF', '#F1E9DA', '#2B2F45', '#7FE3FF']

export function LeagueEmblem({ tier, size = 56, dim }: { tier: number; size?: number; dim?: boolean }) {
  const c = COLORS[tier] ?? COLORS[0]
  return (
    <svg viewBox="0 0 64 72" width={size} height={size * 1.125} aria-hidden style={{ opacity: dim ? 0.35 : 1 }}>
      <path d="M35 6 L60 15 V38 C60 54 48 64 35 70 C22 64 10 54 10 38 V15 Z" fill="#1B1F3B" />
      <path d="M32 3 L57 12 V35 C57 51 45 61 32 67 C19 61 7 51 7 35 V12 Z" fill={c} stroke="#1B1F3B" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 12 L48 18 V34 C48 45 41 52 32 56 C23 52 16 45 16 34 V18 Z" fill="#fff" fillOpacity=".28" />
      <text x="32" y="43" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontWeight="800" fontSize="22" fill="#1B1F3B">
        {tier + 1}
      </text>
    </svg>
  )
}
