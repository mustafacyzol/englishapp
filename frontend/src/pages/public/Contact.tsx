import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Clock, Copy, Mail, MessageCircle } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { PHOTO } from '@/lib/assets'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Misc'
import { Reveal } from '@/components/motion/Page'
import { useToast } from '@/components/ui/Toast'
import { Turnstile } from '../auth/Turnstile'
import { Img } from '@/components/ui/Img'
import { useLocation } from 'react-router-dom'

const TOPICS = ['general', 'course', 'corporate', 'support', 'partnership']

interface Cfg { support_email: string; school_whatsapp: string | null }

export default function Contact() {
  const toast = useToast()
  const cfg = useQuery({ queryKey: ['config'], queryFn: () => get<Cfg>('/config') })
  // /contact?konu=corporate lands with the right subject already chosen.
  const preset = new URLSearchParams(useLocation().search).get('konu') ?? ''
  const [f, setF] = useState({ name: '', email: '', phone: '', topic: TOPICS.includes(preset) ? preset : 'general', message: '', kvkk: false })
  const [captcha, setCaptcha] = useState('')
  const m = useMutation({ mutationFn: () => post<{ message: string }>('/contact', { ...f, captcha }) })
  const err = m.error as ApiError | null
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))
  const email = cfg.data?.support_email ?? 'destek@dilgo.app'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      toast('E-posta adresi kopyalandı', 'success')
    } catch {
      toast(email)
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-5 py-12 lg:grid-cols-[1fr_1.1fr]">
      <Reveal>
        <p className="mb-3 font-extrabold uppercase tracking-widest text-flame">İletişim</p>
        <h1 className="text-[clamp(2.3rem,5vw,3.6rem)] leading-[1.05]">Sorun mu var? Yazman yeterli.</h1>
        <p className="mt-5 text-lg text-ink-soft">Kurslarımız, kurumsal eğitim, üyelik ya da teknik bir konu. Ekibimiz mesajını okuyup en geç 1 iş günü içinde dönüş yapar.</p>
        <div className="mt-8 overflow-hidden rounded-3xl">
          <Img src={PHOTO.reception} alt="Bayrak Dil Okulları karşılama" className="aspect-[4/3] w-full object-cover" />
        </div>
        <div className="mt-6 grid gap-3">
          <button onClick={copy} className="flex items-center gap-4 rounded-2xl border-2 border-line bg-card p-4 text-left hover:bg-paper-2">
            <Mail className="size-6 text-flame" />
            <span className="flex-1"><span className="block text-sm font-bold text-ink-soft">E-posta</span><span className="block text-lg font-extrabold">{email}</span></span>
            <Copy className="size-5 text-ink-soft" />
          </button>
          {cfg.data?.school_whatsapp && (
            <div className="flex items-center gap-4 rounded-2xl border-2 border-line bg-card p-4">
              <MessageCircle className="size-6 text-mint" />
              <span><span className="block text-sm font-bold text-ink-soft">WhatsApp</span><span className="block select-all text-lg font-extrabold">{cfg.data.school_whatsapp}</span></span>
            </div>
          )}
          <div className="flex items-center gap-4 rounded-2xl border-2 border-line bg-card p-4">
            <Clock className="size-6 text-sky" />
            <span><span className="block text-sm font-bold text-ink-soft">Çalışma saatleri</span><span className="block text-lg font-extrabold">Hafta içi 09:00–19:00</span></span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="rounded-[32px] border-2 border-line bg-card p-6 sm:p-9">
          {m.isSuccess ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto size-16 text-mint" />
              <h2 className="mt-4 text-3xl">Mesajın bize ulaştı</h2>
              <p className="mx-auto mt-2 max-w-sm text-ink-soft">{m.data.message}</p>
              <Button className="mt-8" variant="secondary" onClick={() => { m.reset(); setF({ name: '', email: '', phone: '', topic: 'general', message: '', kvkk: false }) }}>Yeni mesaj yaz</Button>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={(e: FormEvent) => { e.preventDefault(); m.mutate() }}>
              <h2 className="text-2xl">Bize yaz</h2>
              {err && <Alert tone="error">{err.first()}</Alert>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="c-name" label="Adın" value={f.name} onChange={set('name')} required error={err?.errors.name?.[0]} />
                <Input id="c-email" label="E-posta" type="email" value={f.email} onChange={set('email')} required error={err?.errors.email?.[0]} />
                <Input id="c-phone" label="Telefon (isteğe bağlı)" value={f.phone} onChange={set('phone')} />
                <Select id="c-topic" label="Konu" value={f.topic} onChange={set('topic')}>
                  <option value="general">Genel soru</option>
                  <option value="course">Kurs ve canlı dersler</option>
                  <option value="corporate">Kurumsal eğitim</option>
                  <option value="support">Üyelik ve teknik destek</option>
                  <option value="partnership">İş birliği</option>
                </Select>
              </div>
              <Textarea id="c-msg" label="Mesajın" rows={6} value={f.message} onChange={set('message')} required error={err?.errors.message?.[0]} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <label className="flex gap-3 text-sm">
                <input type="checkbox" checked={f.kvkk} onChange={set('kvkk')} className="mt-0.5 size-5 accent-[#e8403a]" required />
                <span><Link to="/privacy" className="font-bold underline">KVKK aydınlatma metnini</Link> okudum, mesajımın cevaplanması için bilgilerimin işlenmesini kabul ediyorum.</span>
              </label>
              <Turnstile onToken={setCaptcha} />
              <Button type="submit" size="lg" loading={m.isPending}>Gönder</Button>
            </form>
          )}
        </div>
      </Reveal>
    </section>
  )
}
