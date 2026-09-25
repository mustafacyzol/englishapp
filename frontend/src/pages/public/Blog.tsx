import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock } from 'lucide-react'
import { get } from '@/lib/api'
import { dateTR } from '@/lib/format'
import { media } from '@/lib/assets'
import { Markdown } from '@/lib/markdown'
import type { Paginated } from '@/lib/types'
import { SkeletonPage } from '@/components/ui/Misc'
import { LinkButton } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Page'
import { Img } from '@/components/ui/Img'

interface Post { id: number; slug: string; title: string; excerpt: string | null; cover_image: string | null; category: string | null; author_name: string; reading_minutes: number; published_at: string; body?: string }

export function BlogList() {
  const { data, isLoading } = useQuery({ queryKey: ['blog'], queryFn: () => get<Paginated<Post>>('/blog') })
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const [first, ...rest] = data.data
  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <Reveal className="mb-10">
        <p className="mb-3 font-extrabold uppercase tracking-widest text-flame">Blog</p>
        <h1 className="text-[clamp(2.3rem,5vw,3.6rem)]">İngilizce öğrenmeye dair</h1>
      </Reveal>
      {first && (
        <Reveal>
          <Link to={`/blog/${first.slug}`} className="group mb-12 grid overflow-hidden rounded-[32px] border-2 border-line bg-card lg:grid-cols-2">
            <div className="aspect-[16/10] overflow-hidden lg:aspect-auto"><Img src={media(first.cover_image)} alt="" className="photo transition duration-700 group-hover:scale-105" /></div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <p className="text-sm font-extrabold uppercase tracking-widest text-flame">{first.category}</p>
              <h2 className="mt-2 text-3xl leading-tight group-hover:text-flame sm:text-4xl">{first.title}</h2>
              <p className="mt-4 text-lg text-ink-soft">{first.excerpt}</p>
              <p className="mt-6 flex items-center gap-2 text-sm font-bold text-ink-soft"><Clock className="size-4" /> {first.reading_minutes} dk · {dateTR(first.published_at)}</p>
            </div>
          </Link>
        </Reveal>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.06}>
            <Link to={`/blog/${p.slug}`} className="group block h-full overflow-hidden rounded-3xl border-2 border-line bg-card">
              <div className="aspect-[16/10] overflow-hidden"><Img src={media(p.cover_image)} alt="" loading="lazy" className="photo transition duration-700 group-hover:scale-105" /></div>
              <div className="p-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-flame">{p.category}</p>
                <h3 className="mt-2 text-xl leading-snug group-hover:text-flame">{p.title}</h3>
                <p className="mt-2 line-clamp-2 text-ink-soft">{p.excerpt}</p>
                <p className="mt-4 text-sm font-bold text-ink-soft">{p.reading_minutes} dk okuma</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export function BlogPost() {
  const { slug } = useParams()
  const { data, isLoading } = useQuery({ queryKey: ['post', slug], queryFn: () => get<{ post: Post; related: Post[] }>(`/blog/${slug}`) })
  if (isLoading || !data) return <SkeletonPage variant="cards" />
  const p = data.post
  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <Link to="/blog" className="mb-8 inline-flex items-center gap-1.5 font-bold text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Tüm yazılar</Link>
      <p className="text-sm font-extrabold uppercase tracking-widest text-flame">{p.category}</p>
      <h1 className="mt-2 text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.1]">{p.title}</h1>
      <p className="mt-4 text-sm font-bold text-ink-soft">{p.author_name} · {dateTR(p.published_at)} · {p.reading_minutes} dk okuma</p>
      <div className="my-8 overflow-hidden rounded-3xl"><Img src={media(p.cover_image)} alt="" className="aspect-[16/9] w-full object-cover" /></div>
      <div className="prose-dilgo text-lg leading-relaxed"><Markdown source={p.body ?? ''} /></div>
      <div className="mt-12 rounded-3xl bg-flame/8 p-8 text-center">
        <h2 className="text-2xl">Okuduklarını pratiğe dök</h2>
        <p className="mt-2 text-ink-soft">DilGO'da hikayelerle oku, Ada ile konuş. Ücretsiz.</p>
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
