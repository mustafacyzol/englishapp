import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Eye, Heading2, Lightbulb, ListChecks, MessageSquareQuote, PenLine, Table2 } from 'lucide-react'
import { Markdown } from '@/lib/markdown'

/** Building blocks the guide books are written with; each inserts at the cursor. */
const SNIPPETS: { label: string; icon: typeof Heading2; text: string }[] = [
  { label: 'Yeni sayfa', icon: Heading2, text: '\n\n## Sayfa başlığı\nKonunun ne anlama geldiğini bir iki cümleyle Türkçe anlat.\n' },
  { label: 'Tablo', icon: Table2, text: '\n\n| İngilizce | Türkçesi |\n|---|---|\n| I have got a sister. | Bir kız kardeşim var. |\n' },
  { label: 'Örnekler', icon: PenLine, text: '\n\n- *I **am** a student.* Ben öğrenciyim.\n- *She **is** at home.* O evde.\n' },
  { label: 'Higo ipucu', icon: Lightbulb, text: "\n\n> Higo'nun ipucu: Sık yapılan bir hatayı ve doğrusunu yaz.\n" },
  { label: 'Diyalog', icon: MessageSquareQuote, text: '\n\n> A: Hi! How are you?\n> B: I\'m fine, thanks.\n' },
  { label: 'Sık hata', icon: ListChecks, text: '\n\n| Yanlış | Doğru | Neden? |\n|---|---|---|\n| I have 12 years. | I am 12. | Yaş "to be" ile söylenir. |\n' },
]

/** Splits the markdown into book pages the same way the app does ("---" lines or "##" headings). */
function pages(src: string) {
  const t = src.trim()
  if (!t) return []
  return t.split(/\n-{3,}\n/).length > 1 ? t.split(/\n-{3,}\n/) : t.split(/\n(?=## )/)
}

/**
 * The unit guidebook editor: markdown with one-tap blocks (page, table, examples,
 * Higo tip, dialogue, quiz) and a preview that shows the pages as the book will.
 */
export function GuideField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [page, setPage] = useState(0)
  const list = pages(value)
  const insert = (text: string) => {
    const el = ref.current
    const at = el ? el.selectionStart : value.length
    const next = value.slice(0, at) + text + value.slice(el ? el.selectionEnd : at)
    onChange(next)
    setView('write')
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = at + text.length } })
  }
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-line">
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-line bg-paper-2 p-1.5">
        {SNIPPETS.map((s) => (
          <button key={s.label} type="button" onClick={() => insert(s.text)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-ink-soft transition hover:bg-card hover:text-ink">
            <s.icon className="size-3.5" /> {s.label}
          </button>
        ))}
        <span className="ml-auto flex rounded-lg bg-card p-0.5">
          {(['write', 'preview'] as const).map((k) => (
            <button key={k} type="button" onClick={() => { setView(k); setPage(0) }} className={clsx('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold transition', view === k ? 'bg-inv text-on-inv' : 'text-ink-soft')}>
              {k === 'write' ? <PenLine className="size-3.5" /> : <Eye className="size-3.5" />}{k === 'write' ? 'Yaz' : 'Önizle'}
            </button>
          ))}
        </span>
      </div>
      {view === 'write' ? (
        <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={18} spellCheck={false} placeholder={'## Bu ünitede ne öğreneceksin?\nKonuyu ve ne anlama geldiğini Türkçe anlat...'} className="block w-full resize-y bg-card px-4 py-3 font-mono text-[13px] leading-relaxed focus:outline-none" />
      ) : (
        <div className="bg-[#fffaf0] p-4 text-[#2a2620]">
          {list.length ? (
            <>
              <div className="mb-3 flex flex-wrap gap-1">
                {list.map((p, i) => <button key={i} type="button" onClick={() => setPage(i)} className={clsx('rounded-full px-2.5 py-1 text-[11px] font-extrabold', i === page ? 'bg-inv text-on-inv' : 'bg-black/5')}>{i + 1}. {p.match(/^## (.+)$/m)?.[1]?.slice(0, 22) ?? 'Sayfa'}</button>)}
              </div>
              <div className="max-h-[50vh] overflow-y-auto rounded-xl bg-white/60 p-4 [&_em]:italic"><Markdown source={list[Math.min(page, list.length - 1)].split('\n').filter((l) => !/^>\s*Higo'nun ipucu:/i.test(l)).join('\n')} />
                {list[Math.min(page, list.length - 1)].split('\n').filter((l) => /^>\s*Higo'nun ipucu:/i.test(l)).map((l, i) => <div key={i} className="mt-3 flex gap-2 rounded-2xl bg-butter/25 p-3 text-sm font-semibold"><Lightbulb className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 [&_p]:m-0"><Markdown source={l.replace(/^>\s*Higo'nun ipucu:\s*/i, '')} /></span></div>)}
              </div>
            </>
          ) : <p className="text-sm opacity-60">Henüz içerik yok.</p>}
        </div>
      )}
      <p className="border-t-2 border-line bg-paper-2 px-3 py-2 text-[11px] text-ink-soft">{list.length} sayfa · {value.length} karakter · Her "##" başlığı yeni sayfa açar. "&gt; Higo'nun ipucu:" satırları Higo'nun konuşma balonunda görünür. Konuyu, anlamını ve Türkçe karşılıklı örnekleri yaz. Alıştırmayı rehbere değil derslere koy; uzun sayfalar uygulamada kendiliğinden sonraki sayfaya geçer.</p>
    </div>
  )
}
