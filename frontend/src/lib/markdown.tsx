import type { ReactNode } from 'react'

/** Tiny, safe markdown renderer for guidebooks (headings, bold/italic, lists, quotes, tables). No HTML injection. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k++} className="font-extrabold">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k++} className="rounded bg-paper-2 px-1 font-mono text-sm">{t.slice(1, -1)}</code>)
    else out.push(<em key={k++} className="text-flame not-italic font-semibold">{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i++
      }
      const [head, ...body] = rows
      blocks.push(
        <div key={i} className="my-4 overflow-x-auto rounded-2xl border-2 border-line">
          <table className="w-full text-sm">
            <thead className="bg-paper-2 text-ink"><tr>{head.map((h, j) => <th key={j} className="px-3 py-2 text-left font-extrabold">{inline(h)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri} className="border-t-2 border-line/10">{r.map((c, j) => <td key={j} className="px-3 py-2">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2))
      blocks.push(<ul key={i} className="my-3 space-y-1.5 pl-5 [list-style:square]">{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>)
      continue
    }
    if (line.startsWith('> ')) blocks.push(<blockquote key={i} className="my-5 border-l-4 border-flame pl-4 font-display text-xl font-extrabold">{inline(line.slice(2))}</blockquote>)
    else if (line.startsWith('### ')) blocks.push(<h4 key={i} className="mb-2 mt-5 text-lg font-extrabold">{inline(line.slice(4))}</h4>)
    else if (line.startsWith('## ')) blocks.push(<h3 key={i} className="mb-2 mt-6 text-2xl font-extrabold first:mt-0">{inline(line.slice(3))}</h3>)
    else if (line.trim()) blocks.push(<p key={i} className="my-2 leading-relaxed">{inline(line)}</p>)
    i++
  }
  return <div>{blocks}</div>
}
