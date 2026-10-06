import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, useScroll, useSpring } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, Check, Clock, Link as LinkIcon, Search } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { higoImg } from '@/components/game/Higo'
import { useToast } from '@/components/ui/Toast'
import { dateTR } from '@/lib/format'
import { media } from '@/lib/assets'
import { Markdown } from '@/lib/markdown'
import { useSeo } from '@/lib/seo'
import type { Paginated } from '@/lib/types'
import { SkeletonPage } from '@/components/ui/Misc'
import { LinkButton } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Page'
import { Img } from '@/components/ui/Img'
import { BRAND } from '@/lib/brand'

interface Post { id: number; slug: string; title: string; excerpt: string | null; cover_image: string | null; category: string | null; author_name: string; reading_minutes: number; published_at: string; body?: string }

export function BlogList() {
  const { data, isLoading } = useQuery({ queryKey: ['blog'], queryFn: () => get<Paginated<Post>>('/blog') })
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const cats = [...new Set(data.data.map((p) => p.category).filter(Boolean) as string[])]
  const k = q.trim().toLocaleLowerCase('tr')
  const list = data.data.filter((p) => (!cat || p.category === cat) && (!k || `${p.title} ${p.excerpt ?? ''}`.toLocaleLowerCase('tr').includes(k)))
  const filtering = !!cat || !!k
  const [first, ...rest] = filtering ? [undefined, ...list] : list
  return (
    <div>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pb-8 pt-10 sm:pt-14 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-flame">Blog</p>
            <h1 className="mt-2 font-display text-[clamp(2.3rem,5vw,3.6rem)] font-black leading-[1.05] tracking-tight">İngilizce öğrenmeye dair</h1>
            <p className="mt-2 text-lg text-ink-soft">Rehberler, sınav ipuçları ve kelime listeleri.</p>
          </Reveal>
          <label className="flex h-12 w-full items-center gap-2 rounded-2xl border-2 border-line bg-card px-4 transition focus-within:border-ink/40 lg:w-80">
            <Search className="size-4 shrink-0 text-ink-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yazılarda ara" aria-label="Yazılarda ara" className="h-full min-w-0 flex-1 bg-transparent font-semibold placeholder:text-ink-soft/70 focus:outline-none" />
          </label>
        </div>
        {cats.length > 1 && (
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 pb-6">
            {['', ...cats].map((c) => (
              <button key={c || 'all'} onClick={() => setCat(c)} aria-pressed={cat === c} className={clsx('rounded-full border-2 px-3.5 py-1.5 text-sm font-extrabold transition', cat === c ? 'border-inv bg-inv text-on-inv' : 'border-line bg-card text-ink-soft hover:text-ink')}>{c || 'Tümü'}</button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        {first && (
          <Reveal>
            <Link to={`/blog/${first.slug}`} className="group mb-12 grid overflow-hidden rounded-[32px] border-2 border-line bg-card transition hover:border-ink/20 lg:grid-cols-[1.15fr_1fr]">
              <div className="aspect-[16/10] overflow-hidden lg:aspect-auto"><Img src={media(first.cover_image)} alt="" className="photo transition duration-700 group-hover:scale-105" /></div>
              <div className="flex flex-col justify-center p-7 sm:p-10">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-ink-soft"><span className="rounded-full bg-flame px-2 py-0.5 text-white">Öne çıkan</span>{first.category}</p>
                <h2 className="mt-3 font-display text-3xl font-black leading-tight transition group-hover:text-flame sm:text-4xl">{first.title}</h2>
                <p className="mt-4 text-lg text-ink-soft">{first.excerpt}</p>
                <p className="mt-6 flex items-center gap-2 text-sm font-bold text-ink-soft"><Clock className="size-4" /> {first.reading_minutes} dk · {dateTR(first.published_at)}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 font-extrabold text-flame">Yazıyı oku <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          </Reveal>
        )}
        {!list.length ? (
          <div className="rounded-3xl border-2 border-dashed border-line py-14 text-center">
            <img src={higoImg('think')} alt="" className="mx-auto size-20 object-contain" />
            <p className="mt-3 font-display text-xl font-black">Bu aramaya uygun yazı yok</p>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {(rest as Post[]).map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.06}>
                <Link to={`/blog/${p.slug}`} className="group block h-full">
                  <div className="aspect-[16/10] overflow-hidden rounded-3xl border-2 border-line"><Img src={media(p.cover_image)} alt="" loading="lazy" className="photo transition duration-700 group-hover:scale-105" /></div>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-flame">{p.category}</p>
                  <h3 className="mt-1.5 font-display text-xl font-black leading-snug transition group-hover:text-flame">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-ink-soft">{p.excerpt}</p>
                  <p className="mt-3 text-sm font-bold text-ink-soft">{p.reading_minutes} dk okuma · {dateTR(p.published_at)}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
      <BlogNewsletter />
    </div>
  )
}

/** Newsletter band under the posts: double opt-in, like the footer form. */
function BlogNewsletter() {
  const [email, setEmail] = useState('')
  const sub = useMutation({ mutationFn: () => post<{ message: string }>('/newsletter', { email, source: 'blog' }) })
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="relative overflow-hidden rounded-[32px] bg-inv px-6 py-10 text-on-inv sm:px-10">
        <span aria-hidden className="absolute -right-10 -top-16 size-56 rounded-full bg-flame/30 blur-3xl" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[auto_1fr_1fr]">
          <img src={higoImg('read')} alt="" className="hidden size-24 object-contain lg:block" />
          <div>
            <p className="font-display text-2xl font-black sm:text-3xl">Haftada bir İngilizce ipucu</p>
            <p className="mt-1 text-on-inv/70">Yeni yazılar ve kısa alıştırmalar e-postana gelsin.</p>
          </div>
          {sub.isSuccess ? (
            <p className="flex items-center gap-2 rounded-2xl bg-mint/20 px-4 py-3 font-bold text-mint"><Check className="size-5" strokeWidth={3} /> {sub.data.message}</p>
          ) : (
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); sub.mutate() }} className="flex gap-2 rounded-2xl bg-paper/10 p-1.5 ring-1 ring-paper/15">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" aria-label="E-posta adresin" className="h-11 min-w-0 flex-1 bg-transparent px-3 font-semibold text-on-inv placeholder:text-on-inv/50 focus:outline-none" />
              <button type="submit" disabled={sub.isPending} className="press h-11 shrink-0 rounded-xl bg-flame px-5 font-extrabold text-white disabled:opacity-60">Abone ol</button>
            </form>
          )}
        </div>
        {sub.error && <p className="relative mt-2 text-sm font-bold text-berry">{(sub.error as ApiError).first()}</p>}
      </div>
    </section>
  )
}

/** A thin bar at the top that fills as you read. */
function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const x = useSpring(scrollYProgress, { stiffness: 140, damping: 26 })
  return <motion.div aria-hidden style={{ scaleX: x }} className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-flame" />
}

function Share({ title }: { title: string }) {
  const toast = useToast()
  const url = typeof location !== 'undefined' ? location.href : ''
  const items = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: 'X', href: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-ink-soft">Paylaş:</span>
      {items.map((x) => <a key={x.label} href={x.href} target="_blank" rel="noreferrer" className="rounded-full border-2 border-line px-3 py-1 text-sm font-extrabold transition hover:border-ink/30">{x.label}</a>)}
      <button onClick={() => { void navigator.clipboard?.writeText(url); toast('Bağlantı kopyalandı', 'success') }} className="flex items-center gap-1 rounded-full border-2 border-line px-3 py-1 text-sm font-extrabold transition hover:border-ink/30"><LinkIcon className="size-3.5" /> Kopyala</button>
    </div>
  )
}

export function BlogPost() {
  const { slug } = useParams()
  const { data, isLoading } = useQuery({ queryKey: ['post', slug], queryFn: () => get<{ post: Post; related: Post[] }>(`/blog/${slug}`) })
  const post = data?.post as (Post & { seo_title?: string | null; seo_description?: string | null }) | undefined
  useSeo({ title: post ? post.seo_title || post.title : 'Blog', description: post ? post.seo_description || post.excerpt || undefined : undefined, image: post?.cover_image || undefined })
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const p = data.post
  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <ReadingProgress />
      <Link to="/blog" className="mb-8 inline-flex items-center gap-1.5 font-bold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Tüm yazılar</Link>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-flame">{p.category}</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] font-black leading-[1.1] tracking-tight">{p.title}</h1>
      {p.excerpt && <p className="mt-4 text-xl leading-relaxed text-ink-soft">{p.excerpt}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y-2 border-line py-4">
        <p className="flex items-center gap-3 text-sm font-bold">
          <img src={higoImg('read')} alt="" className="size-10 rounded-full bg-paper-2 object-contain p-1" />
          <span><span className="block">{p.author_name}</span><span className="block font-semibold text-ink-soft">{dateTR(p.published_at)} · {p.reading_minutes} dk okuma</span></span>
        </p>
        <Share title={p.title} />
      </div>
      <div className="my-8 overflow-hidden rounded-3xl"><Img src={media(p.cover_image)} alt="" className="aspect-[16/9] w-full object-cover" /></div>
      <div className="prose-dilgo text-lg leading-relaxed"><Markdown source={p.body ?? ''} /></div>
      <div className="mt-10 border-t-2 border-line pt-6"><Share title={p.title} /></div>
      <div className="mt-12 rounded-3xl bg-flame/8 p-8 text-center">
        <h2 className="text-2xl">Okuduklarını pratiğe dök</h2>
        <p className="mt-2 text-ink-soft">{BRAND}'da hikayelerle oku, Defne ile konuş. Ücretsiz.</p>
        <LinkButton to="/register" className="mt-5">Ücretsiz başla</LinkButton>
      </div>
      {!!data.related.length && (
        <div className="mt-14">
          <h2 className="mb-5 text-2xl">Diğer yazılar</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {data.related.map((r) => (
              <Link key={r.slug} to={`/blog/${r.slug}`} className="group">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl"><Img src={media(r.cover_image)} alt="" loading="lazy" className="photo transition group-hover:scale-105" /></div>
                <p className="mt-3 font-extrabold leading-snug group-hover:text-flame">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
