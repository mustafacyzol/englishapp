import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { ArrowLeft, CheckCircle2, Circle, Languages, Lightbulb, Mic, Plus, Send, Square, Volume2, VolumeX } from 'lucide-react'
import { ApiError, get, post } from '@/lib/api'
import { canListen, listen, speak, stopSpeaking } from '@/lib/speech'
import { ensureMic, micHelpText } from '@/lib/mic'
import type { RewardSummary } from '@/lib/types'
import { Ada } from '@/components/game/Ada'
import { scenarioImg } from '@/lib/assets'
import { Button } from '@/components/ui/Button'
import { Modal, Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { useReward } from '@/components/game/RewardProvider'
import { useAuth } from '@/lib/auth'
import { Img } from '@/components/ui/Img'

interface Msg {
  id: number
  role: 'user' | 'assistant'
  content: string
  feedback?: { reply_tr?: string; correction?: { original: string; corrected: string; explanation_tr: string } | null; new_words?: { word: string; meaning_tr: string }[] } | null
}
interface Conv { id: number; mode: string; title: string; scenario_key: string | null; meta: { goals?: string[]; goals_completed?: number[] } | null; messages: Msg[] }
interface Usage { used: number; limit: number; remaining: number }

export default function AiChat() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const lessonId = params.get('lesson')
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const showReward = useReward()
  const { user, refresh } = useAuth()
  const { data, isLoading } = useQuery({ queryKey: ['conv', id], queryFn: () => get<{ conversation: Conv; usage: Usage }>(`/ai/conversations/${id}`) })
  const [messages, setMessages] = useState<Msg[]>([])
  const [usage, setUsage] = useState<Usage | null>(null)
  const [goalsDone, setGoalsDone] = useState<number[]>([])
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [voice, setVoice] = useState(true)
  const [micBlocked, setMicBlocked] = useState(false)
  const [talking, setTalking] = useState(false)
  const stopRef = useRef<() => void>(() => {})
  const endRef = useRef<HTMLDivElement>(null)
  const spokenRef = useRef(false)

  useEffect(() => {
    if (!data) return
    setMessages(data.conversation.messages)
    setUsage(data.usage)
    setGoalsDone(data.conversation.meta?.goals_completed ?? [])
    setVoice(data.conversation.mode === 'speaking' || data.conversation.mode === 'roleplay')
  }, [data])
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages])
  useEffect(() => () => stopSpeaking(), [])

  const say = (t: string) => {
    setTalking(true)
    speak(t, { rate: user?.preferences?.tts_rate ?? 0.95, onEnd: () => setTalking(false) })
  }
  // read the opening line aloud once
  useEffect(() => {
    if (data && voice && !spokenRef.current && data.conversation.messages.length === 1) {
      spokenRef.current = true
      setTimeout(() => say(data.conversation.messages[0].content), 400)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, voice])

  const send = useMutation({
    mutationFn: (b: { text: string; spoken: boolean }) => post<{ message: Msg; usage: Usage; goals_completed: number[]; reward: RewardSummary }>(`/ai/conversations/${id}/messages`, b),
    onMutate: (b) => setMessages((m) => [...m, { id: -Date.now(), role: 'user', content: b.text }]),
    onSuccess: (r) => {
      setMessages((m) => [...m, r.message])
      setUsage(r.usage)
      setGoalsDone(r.goals_completed)
      if (voice) say(r.message.content)
      refresh()
    },
    onError: (e: ApiError) => {
      setMessages((m) => m.slice(0, -1))
      toast(e.message, 'error')
    },
  })

  const finishLesson = useMutation({
    mutationFn: () => post<{ reward: RewardSummary }>(`/lessons/${lessonId}/complete`, { answers: [] }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['path'] })
      showReward(r.reward, 'Konuşma dersi tamam!')
      nav('/learn')
    },
  })

  const submit = (e?: FormEvent, spoken = false, override?: string) => {
    e?.preventDefault()
    const t = (override ?? text).trim()
    if (!t || send.isPending) return
    setText('')
    stopSpeaking()
    send.mutate({ text: t, spoken })
  }

  const toggleMic = async () => {
    if (listening) return stopRef.current()
    stopSpeaking()
    // Raise the system dialog here rather than letting recognition fail silently.
    const state = await ensureMic()
    if (state === 'denied') {
      setMicBlocked(true)
      return
    }
    setListening(true)
    stopRef.current = listen({
      onPartial: setText,
      onFinal: (t) => submit(undefined, true, t),
      onError: (err) => (err === 'not-allowed' ? setMicBlocked(true) : toast('Seni duyamadım, tekrar dene.', 'error')),
      onEnd: () => setListening(false),
    })
  }

  if (isLoading || !data) return <Spinner />
  const conv = data.conversation
  const goals = conv.meta?.goals ?? []
  const userCount = messages.filter((m) => m.role === 'user').length

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-6xl gap-6 lg:h-[calc(100dvh-7.5rem)]">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border-2 border-line bg-card">
        <header className="flex items-center gap-3 border-b-2 border-line px-4 py-3">
          <Link to="/ai" aria-label="Geri" className="text-ink-soft hover:text-ink"><ArrowLeft className="size-5" /></Link>
          <Ada className="size-11" talking={talking} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">{conv.title}</p>
            <p className="text-xs text-ink-soft">{send.isPending ? 'Ada yazıyor…' : talking ? 'Ada konuşuyor…' : `Kalan mesaj: ${usage?.remaining ?? '-'}`}</p>
          </div>
          <button onClick={() => { setVoice((v) => !v); stopSpeaking() }} className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper-2" aria-label="Sesli yanıt">
            {voice ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-ink-soft" />}
          </button>
        </header>

        {goals.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto border-b-2 border-line/10 px-4 py-2 lg:hidden">
            {goals.map((g, i) => (
              <span key={i} className={clsx('flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', goalsDone.includes(i) ? 'bg-mint/15 text-mint-deep' : 'bg-paper-2 text-ink-soft')}>
                {goalsDone.includes(i) ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />} {g}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto bg-paper/60 p-4">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} onSpeak={say} />
          ))}
          {send.isPending && (
            <div className="flex items-center gap-1 pl-2">
              {[0, 1, 2].map((i) => <motion.span key={i} className="size-2.5 rounded-full bg-ink-soft" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }} />)}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {lessonId && userCount >= 3 && (
          <div className="border-t-2 border-line/10 bg-mint/15 px-4 py-2">
            <Button size="sm" variant="success" block loading={finishLesson.isPending} onClick={() => finishLesson.mutate()}>Dersi tamamla ✓</Button>
          </div>
        )}

        <form onSubmit={submit} className="flex items-end gap-2 border-t-2 border-line p-3">
          {canListen() && (
            <button type="button" onClick={toggleMic} className={clsx('press grid size-12 shrink-0 place-items-center rounded-2xl text-white', listening ? 'bg-flame shadow-[0_3px_0_0_var(--color-flame-deep)] animate-pulse' : 'bg-sky shadow-[0_3px_0_0_var(--color-sky-deep)]')} aria-label="Sesli konuş">
              {listening ? <Square className="size-5" /> : <Mic className="size-5" />}
            </button>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder={listening ? 'Dinliyorum…' : 'İngilizce yaz…'}
            rows={1}
            maxLength={1000}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border-2 border-line bg-paper-2/60 px-4 py-3 font-semibold focus:border-sky focus:bg-card focus:outline-none"
          />
          <button type="submit" disabled={!text.trim() || send.isPending} className="press grid size-12 shrink-0 place-items-center rounded-2xl bg-flame text-white shadow-[0_3px_0_0_var(--color-flame-deep)] disabled:opacity-40" aria-label="Gönder">
            <Send className="size-5" />
          </button>
        </form>
      </div>

      {goals.length > 0 && (
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 overflow-hidden rounded-3xl border-2 border-line bg-card">
            {conv.scenario_key && <Img src={scenarioImg(conv.scenario_key)} alt="" className="aspect-[16/10] w-full object-cover" />}
            <div className="p-5">
            <h3 className="mb-3 text-lg">Görevlerin</h3>
            <ul className="space-y-3">
              {goals.map((g, i) => (
                <li key={i} className="flex gap-2">
                  {goalsDone.includes(i) ? <CheckCircle2 className="size-5 shrink-0 text-mint-deep" /> : <Circle className="size-5 shrink-0 text-ink-soft" />}
                  <span className={clsx('text-sm font-semibold', goalsDone.includes(i) && 'line-through opacity-60')}>{g}</span>
                </li>
              ))}
            </ul>
            {goalsDone.length === goals.length && <p className="mt-4 rounded-xl bg-mint/15 p-3 text-sm font-bold text-mint-deep">Tüm görevler tamam!</p>}
            </div>
          </div>
        </aside>
      )}

      <Modal open={micBlocked} onClose={() => setMicBlocked(false)}>
        <div className="text-center">
          <span className="mx-auto mb-3 grid size-16 place-items-center rounded-2xl bg-berry/10"><Mic className="size-8 text-berry" /></span>
          <h2 className="text-2xl font-extrabold">Mikrofon izni kapalı</h2>
          <p className="mb-6 mt-2 text-ink-soft">{micHelpText()}</p>
          <div className="grid gap-3">
            <Button onClick={async () => { const s = await ensureMic(); if (s === 'granted') setMicBlocked(false) }}>Tekrar dene</Button>
            <Button variant="ghost" onClick={() => setMicBlocked(false)}>Yazarak devam et</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Bubble({ m, onSpeak }: { m: Msg; onSpeak: (t: string) => void }) {
  const [tr, setTr] = useState(false)
  const qc = useQueryClient()
  const toast = useToast()
  const save = useMutation({
    mutationFn: (w: { word: string; meaning_tr: string }) => post('/words', { word: w.word, translation: w.meaning_tr, source: 'ai' }),
    onSuccess: () => { toast('Kelime defterine eklendi ✓', 'success'); qc.invalidateQueries({ queryKey: ['words'] }) },
  })
  if (m.role === 'user')
    return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-sky px-4 py-2.5 font-semibold text-white">{m.content}</motion.div>

  const f = m.feedback
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex max-w-[92%] gap-2.5">
      <Ada className="mt-1 size-8" online={false} />
      <div className="min-w-0 flex-1 space-y-2">
      {f?.correction && (
        <div className="rounded-2xl bg-mint/12 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-mint-deep"><Lightbulb className="size-4" /> Küçük düzeltme</p>
          <p><s className="text-berry">{f.correction.original}</s> → <b>{f.correction.corrected}</b></p>
          <p className="mt-1 text-ink-soft">{f.correction.explanation_tr}</p>
        </div>
      )}
      <div className="rounded-2xl rounded-tl-md border-2 border-line bg-card px-4 py-3">
        <p className="font-semibold leading-relaxed">{m.content}</p>
        <AnimatePresence>{tr && f?.reply_tr && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 border-t-2 border-line/10 pt-2 text-sm italic text-ink-soft">{f.reply_tr}</motion.p>}</AnimatePresence>
        <div className="mt-2 flex gap-3 text-ink-soft">
          <button onClick={() => onSpeak(m.content)} aria-label="Dinle"><Volume2 className="size-4" /></button>
          {f?.reply_tr && <button onClick={() => setTr((t) => !t)} aria-label="Çeviri"><Languages className="size-4" /></button>}
        </div>
      </div>
      {!!f?.new_words?.length && (
        <div className="flex flex-wrap gap-1.5">
          {f.new_words.map((w) => (
            <button key={w.word} onClick={() => save.mutate(w)} className="flex items-center gap-1 rounded-full bg-butter/25 px-2.5 py-1 text-xs font-bold hover:bg-butter/40">
              <Plus className="size-3" /> {w.word} · {w.meaning_tr}
            </button>
          ))}
        </div>
      )}
      </div>
    </motion.div>
  )
}
