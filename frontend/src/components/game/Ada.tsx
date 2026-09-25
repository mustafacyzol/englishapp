import clsx from 'clsx'

/** Ada — DilGO's AI English teacher. Geometric, warm, a little cheeky. */
export function Ada({ className, talking }: { className?: string; talking?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={clsx('shrink-0', className)} aria-label="Ada">
      <circle cx="63" cy="63" r="52" fill="#1B1F3B" />
      <circle cx="60" cy="60" r="52" fill="#3A6FF7" stroke="#1B1F3B" strokeWidth="3" />
      {/* hair */}
      <path d="M22 62 C18 30 42 14 62 16 C86 16 102 34 98 62 C92 44 80 36 60 36 C44 36 30 44 22 62 Z" fill="#1B1F3B" />
      <circle cx="86" cy="22" r="11" fill="#FF5A36" stroke="#1B1F3B" strokeWidth="3" />
      {/* face */}
      <ellipse cx="60" cy="68" rx="30" ry="30" fill="#F6C9A5" stroke="#1B1F3B" strokeWidth="3" />
      <path d="M34 58 C40 44 80 44 86 58" fill="#1B1F3B" />
      {/* glasses */}
      <g stroke="#1B1F3B" strokeWidth="3" fill="#fff" fillOpacity=".35">
        <rect x="38" y="60" width="17" height="13" rx="5" />
        <rect x="65" y="60" width="17" height="13" rx="5" />
        <path d="M55 66 h10" />
      </g>
      <circle cx="47" cy="67" r="2.6" fill="#1B1F3B" />
      <circle cx="73" cy="67" r="2.6" fill="#1B1F3B" />
      <circle cx="40" cy="80" r="4" fill="#FF5A36" opacity=".35" />
      <circle cx="80" cy="80" r="4" fill="#FF5A36" opacity=".35" />
      {talking ? (
        <ellipse cx="60" cy="86" rx="6" ry="5" fill="#1B1F3B">
          <animate attributeName="ry" values="5;2;5" dur="0.35s" repeatCount="indefinite" />
        </ellipse>
      ) : (
        <path d="M52 84 Q60 91 68 84" stroke="#1B1F3B" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      {/* headset mic */}
      <path d="M31 70 C28 86 38 96 50 94" stroke="#1B1F3B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="51" cy="94" r="4" fill="#FFD23F" stroke="#1B1F3B" strokeWidth="2.5" />
    </svg>
  )
}
