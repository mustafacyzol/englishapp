import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Table2 } from 'lucide-react'

export function AdminTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="ink-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b-2 border-line bg-paper-2">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-3 text-xs font-extrabold uppercase tracking-wider">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y-2 divide-line/10">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center font-semibold text-ink-soft">Kayıt yok.</p>}
    </div>
  )
}

export function Pager({ page, last, onPage }: { page: number; last: number; onPage: (p: number) => void }) {
  if (last <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm font-bold">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid size-9 place-items-center rounded-xl border-2 border-line bg-card disabled:opacity-40"><ChevronLeft className="size-4" /></button>
      <span>{page} / {last}</span>
      <button disabled={page >= last} onClick={() => onPage(page + 1)} className="grid size-9 place-items-center rounded-xl border-2 border-line bg-card disabled:opacity-40"><ChevronRight className="size-4" /></button>
    </div>
  )
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' | 'info' }) {
  const c = { default: 'bg-paper-2', good: 'bg-mint/30', warn: 'bg-butter/60', bad: 'bg-berry/20', info: 'bg-sky/20' }[tone]
  return <span className={clsx('inline-flex items-center rounded-lg border-2 border-line/20 px-2 py-0.5 text-xs font-bold', c)}>{children}</span>
}

/**
 * Single-series bar chart (no legend: the title names the series). Thin bars with
 * 4px rounded tops anchored to the baseline, 2px gaps, recessive grid, per-bar
 * hover/focus tooltip, and a table view so no value is hover-only.
 */
export function BarChart({ title, data, color, format = (v) => String(v) }: { title: string; data: { d: string; v: number }[]; color: string; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const W = 600
  const H = 180
  const pad = { l: 44, r: 8, t: 10, b: 22 }
  const max = Math.max(1, ...data.map((x) => x.v))
  const nice = Math.pow(10, Math.floor(Math.log10(max)))
  const top = Math.ceil(max / nice) * nice
  const bw = data.length ? (W - pad.l - pad.r) / data.length : 0
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top)
  const total = data.reduce((a, x) => a + x.v, 0)

  return (
    <figure className="ink-card p-5">
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-soft">{title}</p>
          <p className="font-display text-2xl font-extrabold">{format(total)}</p>
        </div>
        <button onClick={() => setTable((t) => !t)} className="flex items-center gap-1 rounded-lg border-2 border-line/20 px-2 py-1 text-xs font-bold" aria-pressed={table}>
          <Table2 className="size-3.5" /> {table ? 'Grafik' : 'Tablo'}
        </button>
      </figcaption>
      {table ? (
        <div className="max-h-48 overflow-y-auto text-sm">
          <table className="w-full"><tbody>{data.map((x) => <tr key={x.d} className="border-b border-line/10"><td className="py-1">{x.d}</td><td className="py-1 text-right font-mono font-bold">{format(x.v)}</td></tr>)}</tbody></table>
        </div>
      ) : !data.some((x) => x.v > 0) ? (
        <p className="py-12 text-center text-sm text-ink-soft">Son 30 günde veri yok.</p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={pad.l} x2={W - pad.r} y1={y(top * f)} y2={y(top * f)} stroke="currentColor" strokeOpacity={f === 0 ? 0.35 : 0.1} strokeWidth={1} />
                <text x={pad.l - 6} y={y(top * f) + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity=".55">{format(top * f)}</text>
              </g>
            ))}
            {data.map((x, i) => {
              const h = Math.max(0, y(0) - y(x.v))
              const bx = pad.l + i * bw + 1
              const w = Math.max(1, bw - 2)
              const r = Math.min(4, w / 2, h)
              return (
                <g key={x.d} tabIndex={0} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} className="outline-none">
                  <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                  {h > 0 && <path d={`M${bx},${y(0)} V${y(x.v) + r} Q${bx},${y(x.v)} ${bx + r},${y(x.v)} H${bx + w - r} Q${bx + w},${y(x.v)} ${bx + w},${y(x.v) + r} V${y(0)} Z`} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />}
                </g>
              )
            })}
            {data.length > 1 && (
              <>
                <text x={pad.l} y={H - 6} fontSize="10" fill="currentColor" fillOpacity=".55">{data[0].d.slice(5)}</text>
                <text x={W - pad.r} y={H - 6} fontSize="10" textAnchor="end" fill="currentColor" fillOpacity=".55">{data[data.length - 1].d.slice(5)}</text>
              </>
            )}
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 rounded-lg border-2 border-line bg-card px-2.5 py-1.5 text-xs shadow-hard-sm" style={{ left: `${((pad.l + (hover + 0.5) * bw) / W) * 100}%` }}>
              <p className="font-mono text-sm font-extrabold">{format(data[hover].v)}</p>
              <p className="text-ink-soft">{data[hover].d}</p>
            </div>
          )}
        </div>
      )}
    </figure>
  )
}

export const ORDER_STATUS: Record<string, string> = { paid: 'ödendi', pending: 'bekliyor', failed: 'başarısız', refunded: 'iade', cancelled: 'iptal' }
