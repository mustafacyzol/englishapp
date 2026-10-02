import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'

export interface Vocab { word: string; meaning: string; example?: string }
export interface Para { en: string; tr?: string }
export type QuestionType = 'choice' | 'truefalse' | 'gap' | 'order'
export interface Question { type?: QuestionType; q: string; options: string[]; answer: number | string; accept?: string[] }

const cell = 'h-10 w-full rounded-xl border-2 border-line bg-card px-3 text-sm font-semibold focus:border-sky focus:outline-none'

/** Words a reader will not know yet: longer, not in a small list of everyday words. */
const COMMON = new Set('about after again always another around because before being between could every first found friend great house little looked people really should something still their there these thing think those three through today under where which while would years your from have into just know like make more much only other over said some take than that them then they this time very want well were what when will with'.split(' '))

/**
 * Story vocabulary, the easy way: paste "word = anlam" lines in one go, or edit the
 * table row by row. "Metinden öner" lists words from the story text that are not in
 * the list yet, so adding one is a single click. In the reader, these words are
 * underlined and show their meaning on tap.
 */
export function VocabField({ value, onChange, paragraphs }: { value: Vocab[]; onChange: (v: Vocab[]) => void; paragraphs: Para[] }) {
  const [bulk, setBulk] = useState('')
  const list = value ?? []
  const set = (i: number, patch: Partial<Vocab>) => onChange(list.map((v, k) => (k === i ? { ...v, ...patch } : v)))
  const have = new Set(list.map((v) => v.word.toLowerCase()))
  const suggestions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of paragraphs ?? []) {
      for (const m of p.en.matchAll(/[A-Za-z][A-Za-z'-]{4,}/g)) {
        const w = m[0].toLowerCase().replace(/'s$/, '')
        if (!COMMON.has(w) && !have.has(w) && !seen.has(w)) seen.set(w, p.en)
      }
    }
    return [...seen.entries()].slice(0, 24)
  }, [paragraphs, list]) // eslint-disable-line react-hooks/exhaustive-deps

  const addBulk = () => {
    const rows = bulk.split('\n').map((l) => l.split(/\s*(?:=|:|\t|\s-\s|–)\s*/)).filter((p) => p[0]?.trim())
    const next = [...list]
    for (const [w, m = '', ex] of rows) {
      const word = w.trim()
      const i = next.findIndex((v) => v.word.toLowerCase() === word.toLowerCase())
      const row = { word, meaning: m.trim(), ...(ex ? { example: ex.trim() } : {}) }
      if (i >= 0) next[i] = { ...next[i], ...row }
      else next.push(row)
    }
    onChange(next)
    setBulk('')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-dashed border-line p-3">
        <p className="mb-1.5 text-sm font-bold">Toplu ekle <span className="font-semibold text-ink-soft">(her satıra bir kelime: <code className="rounded bg-paper-2 px-1">kelime = anlam</code>)</span></p>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={3} placeholder={'umbrella = şemsiye\nsuddenly = aniden\nborrow = ödünç almak'} className="w-full rounded-xl border-2 border-line bg-card px-3 py-2 font-mono text-sm focus:border-sky focus:outline-none" />
        <button type="button" disabled={!bulk.trim()} onClick={addBulk} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-extrabold text-paper disabled:opacity-40"><Plus className="size-4" /> Listeye ekle</button>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-ink-soft"><Wand2 className="size-3.5" /> Metinden öner (tıkla, ekle)</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(([w, ex]) => (
              <button key={w} type="button" onClick={() => onChange([...list, { word: w, meaning: '', example: ex }])} className="rounded-full border-2 border-line px-2.5 py-1 text-xs font-bold hover:border-flame hover:text-flame">+ {w}</button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border-2 border-line">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-paper-2 px-3 py-2 text-xs font-black uppercase tracking-wider text-ink-soft"><span>Kelime</span><span>Türkçesi</span><span className="w-9" /></div>
        {list.length === 0 && <p className="p-4 text-center text-sm text-ink-soft">Henüz kelime yok.</p>}
        {list.map((v, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-t-2 border-line/40 px-3 py-2">
            <input value={v.word} onChange={(e) => set(i, { word: e.target.value })} className={cell} aria-label="Kelime" />
            <input value={v.meaning} onChange={(e) => set(i, { meaning: e.target.value })} placeholder="anlamı" className={clsx(cell, !v.meaning && 'border-butter')} aria-label="Türkçesi" />
            <button type="button" onClick={() => onChange(list.filter((_, k) => k !== i))} className="grid size-9 place-items-center rounded-xl text-ink-soft hover:bg-berry/10 hover:text-berry" aria-label="Sil"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
      {list.some((v) => !v.meaning.trim()) && <p className="text-xs font-bold text-butter-deep">Sarı kutulardaki kelimelerin Türkçesini yaz; boş kalanlar okuyucuda "anlamı yok" görünür.</p>}
    </div>
  )
}

/** Paragraphs as English/Turkish pairs, reorderable, instead of raw JSON. */
export function ParagraphsField({ value, onChange }: { value: Para[]; onChange: (v: Para[]) => void }) {
  const list = value?.length ? value : [{ en: '', tr: '' }]
  const set = (i: number, patch: Partial<Para>) => onChange(list.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  const move = (i: number, d: number) => {
    const next = [...list]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {list.map((p, i) => (
        <div key={i} className="rounded-2xl border-2 border-line p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ink-soft">
            Paragraf {i + 1}
            <span className="ml-auto flex gap-1">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded-lg hover:bg-paper-2 disabled:opacity-30" aria-label="Yukarı"><ArrowUp className="size-4" /></button>
              <button type="button" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded-lg hover:bg-paper-2 disabled:opacity-30" aria-label="Aşağı"><ArrowDown className="size-4" /></button>
              <button type="button" disabled={list.length === 1} onClick={() => onChange(list.filter((_, k) => k !== i))} className="grid size-7 place-items-center rounded-lg hover:bg-berry/10 hover:text-berry disabled:opacity-30" aria-label="Sil"><Trash2 className="size-4" /></button>
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <textarea value={p.en} onChange={(e) => set(i, { en: e.target.value })} rows={4} placeholder="English paragraph" className="w-full rounded-xl border-2 border-line bg-card px-3 py-2 text-sm focus:border-sky focus:outline-none" />
            <textarea value={p.tr ?? ''} onChange={(e) => set(i, { tr: e.target.value })} rows={4} placeholder="Türkçe çevirisi (isteğe bağlı)" className="w-full rounded-xl border-2 border-line bg-card px-3 py-2 text-sm focus:border-sky focus:outline-none" />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...list, { en: '', tr: '' }])} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-2 text-sm font-extrabold"><Plus className="size-4" /> Paragraf ekle</button>
      <p className="text-xs text-ink-soft">İpucu: 3-5 cümlelik paragraflar okumayı akıcı tutar. Okuyucu hikâyeyi tek sayfada, kitap gibi gösterir ve sesli okurken paragrafı vurgular.</p>
    </div>
  )
}

const QTYPES: { key: QuestionType; label: string; hint: string }[] = [
  { key: 'choice', label: 'Çoktan seçmeli', hint: 'Dört seçenek, yuvarlak işaretli olan doğru.' },
  { key: 'truefalse', label: 'Doğru / Yanlış', hint: 'Cümleyi yaz, doğru mu yanlış mı seç.' },
  { key: 'gap', label: 'Boşluk doldurma', hint: 'Soruda ___ ile boşluk bırak. Doğru cevabı ve kabul edilen diğer yazımları gir.' },
  { key: 'order', label: 'Cümle sıralama', hint: 'Kelimeleri doğru sırayla gir; öğrenciye karışık gösterilir.' },
]

/** Comprehension questions of four kinds. Asked after the story, in the "Anlama testi". Each right answer pays XP. */
export function QuestionsField({ value, onChange }: { value: Question[]; onChange: (v: Question[]) => void }) {
  const list = value ?? []
  const set = (i: number, patch: Partial<Question>) => onChange(list.map((q, k) => (k === i ? { ...q, ...patch } : q)))
  const retype = (i: number, type: QuestionType) => set(i, type === 'truefalse' ? { type, options: ['Doğru', 'Yanlış'], answer: 0 } : type === 'gap' ? { type, options: [], answer: '', accept: [] } : type === 'order' ? { type, options: ['', '', '', ''], answer: '' } : { type, options: ['', '', '', ''], answer: 0 })
  return (
    <div className="space-y-3">
      {list.map((q, i) => {
        const type = q.type ?? 'choice'
        return (
          <div key={i} className="rounded-2xl border-2 border-line p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-ink-soft">Soru {i + 1}</span>
              <select value={type} onChange={(e) => retype(i, e.target.value as QuestionType)} className="h-8 rounded-lg border-2 border-line bg-card px-2 text-xs font-bold">
                {QTYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <button type="button" onClick={() => onChange(list.filter((_, k) => k !== i))} className="ml-auto grid size-7 place-items-center rounded-lg hover:bg-berry/10 hover:text-berry" aria-label="Soruyu sil"><Trash2 className="size-4" /></button>
            </div>
            <input value={q.q} onChange={(e) => set(i, { q: e.target.value })} placeholder={type === 'gap' ? 'Örn. Mia forgot her ___ at the café.' : type === 'order' ? 'Örn. Cümleyi sırala' : type === 'truefalse' ? 'Örn. Mia was late for school.' : 'Soru'} className={cell} />
            {(type === 'choice' || type === 'truefalse') && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, o) => (
                  <label key={o} className={clsx('flex items-center gap-2 rounded-xl border-2 px-2', q.answer === o ? 'border-mint bg-mint/8' : 'border-line')}>
                    <input type="radio" checked={q.answer === o} onChange={() => set(i, { answer: o })} aria-label="Doğru cevap" />
                    <input value={opt} disabled={type === 'truefalse'} onChange={(e) => { const opts = [...q.options]; opts[o] = e.target.value; set(i, { options: opts }) }} placeholder={`Seçenek ${o + 1}`} className="h-9 w-full bg-transparent text-sm font-semibold focus:outline-none" />
                  </label>
                ))}
              </div>
            )}
            {type === 'gap' && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input value={String(q.answer ?? '')} onChange={(e) => set(i, { answer: e.target.value })} placeholder="Doğru cevap" className={cell} />
                <input value={(q.accept ?? []).join(', ')} onChange={(e) => set(i, { accept: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="Kabul edilen diğer yazımlar (virgülle)" className={cell} />
              </div>
            )}
            {type === 'order' && (
              <div className="mt-2">
                <input value={q.options.join(' ')} onChange={(e) => set(i, { options: e.target.value.split(/\s+/).filter(Boolean), answer: e.target.value.trim() })} placeholder="Doğru cümle (kelimeler boşlukla): She opened the old letter" className={cell} />
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-ink-soft">{QTYPES.find((t) => t.key === type)?.hint}</p>
          </div>
        )
      })}
      <button type="button" onClick={() => onChange([...list, { type: 'choice', q: '', options: ['', '', '', ''], answer: 0 }])} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 py-2 text-sm font-extrabold"><Sparkles className="size-4" /> Soru ekle</button>
      <p className="text-xs text-ink-soft">Sorular hikâye bittikten sonra "Anlama testi" adıyla, tek tek sorulur.</p>
    </div>
  )
}
