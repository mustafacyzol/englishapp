import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowLeft, Bold, Eye, Heading2, ImageIcon, Italic, Link2, List, ListOrdered, PenLine, Plus, Quote, Search, Trash2 } from 'lucide-react'
import { ApiError, del, get, post, put } from '@/lib/api'
import { media } from '@/lib/assets'
import { dateTR } from '@/lib/format'
import { Markdown } from '@/lib/markdown'
import type { Paginated } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Alert, Spinner, Tabs } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle, Pager, Pill, Table } from './kit'

interface Post {
  id: number
  slug: string
  title: string
  excerpt: string | null
  body: string
  cover_image: string | null
  category: string | null
  author_name: string | null
  seo_title: string | null
  seo_description: string | null
  tags: string[] | null
  reading_minutes: number
  is_published: boolean
  published_at: string | null
  views?: number
}

const CATEGORIES = ['İpuçları', 'Sınavlar', 'Kelime', 'Konuşma', 'Veliler için', 'Kurumlar', 'Duyurular']

const slugify = (s: string) =>
  s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)

function stateOf(p: Pick<Post, 'is_published' | 'published_at'>): { label: string; tone: 'good' | 'warn' | 'default' } {
  if (!p.is_published) return { label: 'Taslak', tone: 'default' }
  if (p.published_at && new Date(p.published_at) > new Date()) return { label: 'Zamanlandı', tone: 'warn' }
  return { label: 'Yayında', tone: 'good' }
}

/** The blog list: what is live, what is scheduled, what is still a draft. */
export function BlogList() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ page: String(page), ...(q && { q }) })
  const { data, isLoading } = useQuery({ queryKey: ['admin-blog', params.toString()], queryFn: () => get<Paginated<Post>>(`/admin/blog-posts?${params}`, true) })
  return (
    <div>
      <AdminTitle title="Blog yazıları">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <Input placeholder="Başlık ara" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="w-56 [&_input]:pl-9" />
        </label>
        <Link to="/admin/blog/new"><Button icon={<Plus className="size-4" />}>Yeni yazı</Button></Link>
      </AdminTitle>
      {isLoading || !data ? <Spinner /> : (
        <>
          <Table head={['Yazı', 'Kategori', 'Durum', 'Tarih', 'Okunma']} empty={!data.data.length}>
            {data.data.map((p) => {
              const st = stateOf(p)
              return (
                <tr key={p.id} className="hover:bg-paper-2">
                  <td className="px-4 py-2.5">
                    <Link to={`/admin/blog/${p.id}`} className="flex items-center gap-3">
                      <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-paper-2">{p.cover_image && <img src={media(p.cover_image)} alt="" className="size-full object-cover" />}</span>
                      <span className="min-w-0"><span className="block font-bold hover:text-flame">{p.title}</span><span className="block truncate text-xs text-ink-soft">/blog/{p.slug}</span></span>
                    </Link>
                  </td>
                  <td className="px-4">{p.category ?? '-'}</td>
                  <td className="px-4"><Pill tone={st.tone}>{st.label}</Pill></td>
                  <td className="px-4">{p.published_at ? dateTR(p.published_at) : '-'}</td>
                  <td className="px-4 font-mono">{p.views ?? 0}</td>
                </tr>
              )
            })}
          </Table>
          <Pager page={data.current_page} last={data.last_page} onPage={setPage} />
        </>
      )}
    </div>
  )
}

const EMPTY: Omit<Post, 'id'> = { slug: '', title: '', excerpt: '', body: '', cover_image: '', category: 'İpuçları', author_name: 'Bayrak Dil Okulları', seo_title: '', seo_description: '', tags: [], reading_minutes: 0, is_published: false, published_at: null }

/** One post: write on the left, publish and SEO on the right. */
export function BlogEdit() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const existing = useQuery({ queryKey: ['admin-blog-post', id], queryFn: () => get<{ data: Post }>(`/admin/blog-posts/${id}`, true), enabled: !isNew })
  const [p, setP] = useState<Omit<Post, 'id'>>(EMPTY)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [tag, setTag] = useState('')
  const body = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (existing.data) setP({ ...EMPTY, ...existing.data.data, tags: existing.data.data.tags ?? [] })
  }, [existing.data])
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((x) => ({ ...x, [k]: v }))
  const words = useMemo(() => (p.body.trim() ? p.body.trim().split(/\s+/).length : 0), [p.body])

  const save = useMutation({
    mutationFn: (publish?: boolean) => {
      const b = { ...p, is_published: publish ?? p.is_published, reading_minutes: Math.max(1, Math.ceil(words / 200)), slug: p.slug || slugify(p.title) }
      return isNew ? post<{ data: Post }>('/admin/blog-posts', b, true) : put<{ data: Post }>(`/admin/blog-posts/${id}`, b, true)
    },
    onSuccess: (r, publish) => {
      qc.invalidateQueries({ queryKey: ['admin-blog'] })
      toast(publish ? 'Yayınlandı' : 'Kaydedildi', 'success')
      if (isNew && r?.data?.id) nav(`/admin/blog/${r.data.id}`, { replace: true })
      else if (publish !== undefined) set('is_published', publish)
    },
  })
  const remove = useMutation({
    mutationFn: () => del(`/admin/blog-posts/${id}`, true),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-blog'] }); toast('Yazı silindi', 'success'); nav('/admin/blog') },
  })
  const err = save.error as ApiError | null

  /** Wrap the selection (or insert a template) in the body textarea. */
  const wrap = (before: string, after = '', placeholder = '') => {
    const el = body.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b, value } = el
    const sel = value.slice(a, b) || placeholder
    const next = value.slice(0, a) + before + sel + after + value.slice(b)
    set('body', next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + before.length, a + before.length + sel.length) })
  }
  /** Start a new block line (heading, list item, quote, image) at the cursor. */
  const line = (text: string, selectFrom = 0, selectTo = text.length) => {
    const el = body.current
    if (!el) return
    const a = el.selectionStart
    const lead = a === 0 || p.body[a - 1] === '\n' ? '' : '\n'
    set('body', p.body.slice(0, a) + lead + text + '\n' + p.body.slice(a))
    const at = a + lead.length
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(at + selectFrom, at + selectTo) })
  }
  const TOOLS = [
    { icon: Heading2, t: 'Ara başlık', f: () => line('## Ara başlık', 3) },
    { icon: Bold, t: 'Kalın', f: () => wrap('**', '**', 'kalın metin') },
    { icon: Italic, t: 'Vurgu', f: () => wrap('*', '*', 'vurgulu') },
    { icon: Link2, t: 'Bağlantı', f: () => wrap('[', '](https://)', 'bağlantı metni') },
    { icon: List, t: 'Madde listesi', f: () => line('- madde', 2) },
    { icon: ListOrdered, t: 'Numaralı liste', f: () => line('1. adım', 3) },
    { icon: Quote, t: 'Alıntı', f: () => line('> Öne çıkan cümle', 2) },
    { icon: ImageIcon, t: 'Görsel', f: () => line('![Görsel açıklaması](https://)', 22, 30) },
  ]

  if (!isNew && (existing.isLoading || !existing.data)) return <Spinner />
  const st = stateOf(p)
  const seoTitle = p.seo_title || p.title
  const seoDesc = p.seo_description || p.excerpt || ''
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/admin/blog" className="grid size-10 place-items-center rounded-xl border-2 border-line bg-card" aria-label="Yazılara dön"><ArrowLeft className="size-5" /></Link>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold sm:text-3xl">{isNew ? 'Yeni yazı' : p.title || 'Başlıksız'}</h1>
        <Pill tone={st.tone}>{st.label}</Pill>
      </div>
      {err && <div className="mb-4"><Alert tone="error">{err.first()}</Alert></div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <div className="space-y-4">
          <div className="ink-card space-y-4 p-5">
            <Input label="Başlık" value={p.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} error={err?.first('title')} placeholder="Okurun göreceği başlık" />
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Adres</span>
              <span className="flex items-center overflow-hidden rounded-2xl border-2 border-line bg-card focus-within:border-sky">
                <span className="shrink-0 bg-paper-2 px-3 py-3 text-sm font-semibold text-ink-soft">/blog/</span>
                <input value={p.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} className="h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm focus:outline-none" />
              </span>
              {err?.first('slug') && <span className="mt-1 block text-sm font-bold text-berry">{err.first('slug')}</span>}
            </label>
            <div>
              <Textarea label="Kısa özet (listede ve paylaşımda görünür)" rows={2} maxLength={400} value={p.excerpt ?? ''} onChange={(e) => set('excerpt', e.target.value)} />
              <p className="mt-1 text-right text-xs text-ink-soft">{(p.excerpt ?? '').length}/400</p>
            </div>
          </div>

          <div className="ink-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b-2 border-line bg-paper-2 px-3 py-2">
              <Tabs value={view} onChange={setView} items={[{ value: 'write', label: <span className="inline-flex items-center gap-1.5"><PenLine className="size-4" />Yaz</span> }, { value: 'preview', label: <span className="inline-flex items-center gap-1.5"><Eye className="size-4" />Önizle</span> }]} />
              {view === 'write' && (
                <div className="flex flex-wrap gap-0.5">
                  {TOOLS.map((t) => (
                    <button key={t.t} type="button" title={t.t} aria-label={t.t} onClick={t.f} className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-card hover:text-ink"><t.icon className="size-4" /></button>
                  ))}
                </div>
              )}
              <span className="ml-auto text-xs font-bold text-ink-soft">{words} kelime · ~{Math.max(1, Math.ceil(words / 200))} dk okuma</span>
            </div>
            {view === 'write' ? (
              <textarea ref={body} value={p.body} onChange={(e) => set('body', e.target.value)} placeholder={'Yazmaya başla…\n\n## Ara başlık\nParagraf. **kalın**, *vurgu*, [bağlantı](https://…)\n\n- madde\n1. adım\n> alıntı'} className="block min-h-[55vh] w-full resize-y bg-card p-5 font-mono text-[15px] leading-relaxed focus:outline-none" />
            ) : (
              <article className="min-h-[55vh] p-6 sm:p-8">
                <p className="text-sm font-extrabold uppercase tracking-widest text-flame">{p.category}</p>
                <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">{p.title || 'Başlık'}</h1>
                {p.cover_image && <img src={media(p.cover_image)} alt="" className="my-6 aspect-[16/9] w-full rounded-3xl object-cover" />}
                <div className="prose-dilgo text-lg leading-relaxed">{p.body ? <Markdown source={p.body} /> : <p className="text-ink-soft">Henüz içerik yok.</p>}</div>
              </article>
            )}
            {err?.first('body') && <p className="px-5 pb-3 text-sm font-bold text-berry">{err.first('body')}</p>}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="ink-card space-y-3 p-5">
            <h2 className="font-extrabold">Yayın</h2>
            <Input label="Yayın tarihi ve saati" type="datetime-local" value={p.published_at ? toLocal(p.published_at) : ''} onChange={(e) => set('published_at', e.target.value ? new Date(e.target.value).toISOString() : null)} hint="Boşsa yayınladığın an. İleri bir tarih seçersen o gün otomatik görünür." />
            <div className="grid gap-2">
              {p.is_published ? (
                <>
                  <Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Değişiklikleri kaydet</Button>
                  <Button block variant="secondary" onClick={() => save.mutate(false)}>Yayından kaldır (taslağa al)</Button>
                </>
              ) : (
                <>
                  <Button block loading={save.isPending} onClick={() => save.mutate(true)}>{p.published_at && new Date(p.published_at) > new Date() ? 'Zamanla' : 'Yayınla'}</Button>
                  <Button block variant="secondary" onClick={() => save.mutate(false)}>Taslak olarak kaydet</Button>
                </>
              )}
              {!isNew && st.label === 'Yayında' && <Link to={`/blog/${p.slug}`} target="_blank" className="text-center text-sm font-bold text-flame">Sitede gör</Link>}
            </div>
          </section>

          <section className="ink-card space-y-3 p-5">
            <h2 className="font-extrabold">Kapak ve künye</h2>
            <div className="aspect-[16/9] overflow-hidden rounded-2xl border-2 border-dashed border-line bg-paper-2">
              {p.cover_image ? <img src={media(p.cover_image)} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs font-bold text-ink-soft">Kapak görseli yok</span>}
            </div>
            <Input label="Kapak görseli adresi" value={p.cover_image ?? ''} onChange={(e) => set('cover_image', e.target.value)} placeholder="https://… veya /img/…" />
            <Select label="Kategori" value={CATEGORIES.includes(p.category ?? '') ? p.category ?? '' : '__custom'} onChange={(e) => set('category', e.target.value === '__custom' ? '' : e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              <option value="__custom">Başka…</option>
            </Select>
            {!CATEGORIES.includes(p.category ?? '') && <Input label="Yeni kategori" value={p.category ?? ''} onChange={(e) => set('category', e.target.value)} />}
            <Input label="Yazar" value={p.author_name ?? ''} onChange={(e) => set('author_name', e.target.value)} />
            <div>
              <span className="mb-1.5 block text-sm font-bold">Etiketler</span>
              <div className="flex flex-wrap gap-1.5">
                {(p.tags ?? []).map((t) => (
                  <button key={t} type="button" onClick={() => set('tags', (p.tags ?? []).filter((x) => x !== t))} className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-bold hover:bg-berry/15" title="Kaldır">#{t} ×</button>
                ))}
                <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ',') && tag.trim()) { e.preventDefault(); if ((p.tags ?? []).length < 8) set('tags', [...new Set([...(p.tags ?? []), tag.trim().slice(0, 30)])]); setTag('') } }} placeholder="Ekle + Enter" className="h-8 min-w-24 flex-1 rounded-full border-2 border-line bg-card px-3 text-xs focus:outline-none" />
              </div>
            </div>
          </section>

          <section className="ink-card space-y-3 p-5">
            <h2 className="font-extrabold">Arama motoru (SEO)</h2>
            <div className="rounded-2xl border-2 border-line bg-card p-3">
              <p className="truncate text-xs text-ink-soft">dilgo.app › blog › {p.slug || 'adres'}</p>
              <p className="mt-0.5 line-clamp-1 text-[17px] font-semibold text-[#1a0dab] dark:text-sky">{seoTitle || 'Sayfa başlığı'}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{seoDesc || 'Arama sonucunda görünecek kısa açıklama.'}</p>
            </div>
            <div>
              <Input label="SEO başlığı (boşsa yazı başlığı)" maxLength={70} value={p.seo_title ?? ''} onChange={(e) => set('seo_title', e.target.value)} />
              <p className={clsx('mt-1 text-right text-xs', seoTitle.length > 60 ? 'font-bold text-berry' : 'text-ink-soft')}>{seoTitle.length}/60 önerilen</p>
            </div>
            <div>
              <Textarea label="SEO açıklaması (boşsa özet)" rows={3} maxLength={170} value={p.seo_description ?? ''} onChange={(e) => set('seo_description', e.target.value)} />
              <p className={clsx('mt-1 text-right text-xs', seoDesc.length > 160 ? 'font-bold text-berry' : 'text-ink-soft')}>{seoDesc.length}/160 önerilen</p>
            </div>
          </section>

          {!isNew && (
            <Button block variant="ghost" className="text-berry" icon={<Trash2 className="size-4" />} loading={remove.isPending} onClick={() => confirm('Bu yazı kalıcı olarak silinsin mi?') && remove.mutate()}>Yazıyı sil</Button>
          )}
        </aside>
      </div>
    </div>
  )
}

/** ISO → value for a datetime-local input, in the viewer's time zone. */
function toLocal(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
