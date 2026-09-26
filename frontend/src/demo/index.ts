/**
 * Demo mode: replays responses recorded from a seeded DilGO backend so the whole app can be
 * explored without a server (used for the shareable preview build, VITE_DEMO=1).
 * Mutations update an in-memory copy, and Defne's replies come from a small rule-based script.
 */
import fixture from './fixture.json'

type Json = any // eslint-disable-line @typescript-eslint/no-explicit-any
const F = fixture as { get: Record<string, Json>; post: Record<string, Json>; err: Record<string, { status: number; message: string }> }
const db: Record<string, Json> = structuredClone(F.get)
const me = () => db['/auth/me'].user
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class DemoError extends Error {
  status: number
  errors: Record<string, string[]>
  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

// ---------------------------------------------------------------- state helpers
function syncUser() {
  const u = me()
  for (const k of Object.keys(db)) {
    const v = db[k]
    if (v && typeof v === 'object' && v.user && v.user.id === u.id) v.user = u
  }
}
function addGems(n: number) {
  me().stats.gems += n
  syncUser()
}
function bumpQuests(metric: string, n: number) {
  const done: Json[] = []
  for (const q of db['/quests']?.data ?? []) {
    if (q.metric !== metric || q.completed) continue
    q.progress = Math.min(q.target, q.progress + n)
    if (q.progress >= q.target) {
      q.completed = true
      done.push({ id: q.id, title: q.title, reward_gems: q.reward_gems })
    }
  }
  return done
}
function reward(xp: number, extra: Json = {}, metrics: Record<string, number> = {}) {
  const u = me()
  const quests = [...bumpQuests('xp', xp), ...Object.entries(metrics).flatMap(([k, v]) => bumpQuests(k, v))]
  const dash = db['/dashboard']
  const before = dash.today.xp
  const goal = dash.today.goal
  u.stats.xp_total += xp
  dash.today.xp += xp
  const goalNow = before < goal && dash.today.xp >= goal
  const rewards = goalNow ? [{ title: 'Günlük hedef bonusu', icon: 'gem', gems: 5 }] : []
  if (goalNow) {
    u.stats.gems += 5
    dash.today.goal_met = true
  }
  const levelUp = u.stats.xp_total >= u.stats.level_ceil
  if (levelUp) {
    u.stats.level += 1
    u.stats.level_floor = u.stats.level_ceil
    u.stats.level_ceil = Math.round(u.stats.level_ceil * 1.45)
    u.stats.gems += 20
    rewards.push({ title: `Seviye ${u.stats.level} ödülü`, icon: 'gem', gems: 20 })
  }
  const row = db['/league']?.rows?.find((r: Json) => r.is_me)
  if (row) row.xp += xp
  syncUser()
  return {
    xp_gained: xp, multiplier: 1, xp_total: u.stats.xp_total, level: u.stats.level, level_up: levelUp,
    streak: u.stats.streak, streak_extended: false, daily_xp: dash.today.xp, daily_goal: goal, goal_met_now: goalNow,
    quests_completed: quests, achievements: [], rewards, gems: u.stats.gems, ...extra,
  }
}
function unlockNext(lessonId: number) {
  for (const k of Object.keys(db).filter((x) => x === '/path' || x.startsWith('/path/'))) {
    const lessons = db[k].units.flatMap((u: Json) => u.lessons)
    const i = lessons.findIndex((l: Json) => l.id === lessonId)
    if (i < 0) continue
    lessons[i].state = 'completed'
    lessons[i].crowns = Math.min(5, (lessons[i].crowns ?? 0) + 1)
    const next = lessons.find((l: Json) => l.state === 'locked' || l.state === 'current')
    if (next && next.state === 'locked' && !lessons.some((l: Json) => l.state === 'current')) next.state = 'current'
  }
}

// ---------------------------------------------------------------- Defne (rule-based)
const FIXES: [RegExp, string, string][] = [
  [/\bI am agree\b/i, 'I agree', '"Agree" bir fiildir; "am" gerekmez. Türkçedeki "katılıyorum" yapısına kanma.'],
  [/\bI have (\d+) years\b/i, "I'm $1 years old", 'Yaş söylerken "have" değil "be" kullanılır: I\'m 25 years old.'],
  [/\bI want (a|an|one|the) /i, "I'd like $1 ", 'Sipariş verirken "I want" biraz sert durur; "I\'d like" daha kibar.'],
  [/\bone cake\b/i, 'a slice of cake', 'Kek dilimle istenir: "a slice of cake".'],
  [/\b(he|she|it) (go|like|want|have|work|live)\b/i, '$1 $2s', 'He/she/it ile geniş zamanda fiile -s eklenir.'],
  [/\byesterday I (go|eat|see|do)\b/i, 'yesterday I __PAST__', 'Geçmişte olan bir şey için past simple kullanılır.'],
  [/\bdidn't (went|ate|saw|did)\b/i, "didn't __BASE__", '"didn\'t" sonrası fiilin yalın hali gelir.'],
  [/\ba (apple|hour|orange|interview|idea)\b/i, 'an $1', 'Sesli harfle başlayan kelimelerden önce "an" kullanılır.'],
  [/\bmore better\b/i, 'better', '"Better" zaten karşılaştırma; "more" eklenmez.'],
  [/\binformations\b/i, 'information', '"Information" sayılamaz; çoğul eki almaz.'],
  [/\bpeople is\b/i, 'people are', '"People" çoğuldur: people are.'],
  [/\bI am (go|come|work|study)\b/i, "I'm $1ing", 'Şu an yaptığın bir şey için "am + -ing" kullanılır.'],
  [/\bin the weekend\b/i, 'at the weekend', 'İngiliz İngilizcesinde "at the weekend" (ya da "on the weekend") denir.'],
]
const PAST: Record<string, string> = { go: 'went', eat: 'ate', see: 'saw', do: 'did' }
const BASE: Record<string, string> = { went: 'go', ate: 'eat', saw: 'see', did: 'do' }

function correct(text: string) {
  for (const [re, rep, why] of FIXES) {
    const m = text.match(re)
    if (!m) continue
    let fixed = text.replace(re, rep)
    fixed = fixed.replace('__PAST__', PAST[m[1]?.toLowerCase()] ?? m[1]).replace('__BASE__', BASE[m[1]?.toLowerCase()] ?? m[1])
    return { original: text, corrected: fixed, explanation_tr: why }
  }
  return null
}

const SCRIPTS: Record<string, [string, string, { word: string; meaning_tr: string }[]][]> = {
  'order-at-a-cafe': [
    ['Great choice! Would you like anything to eat with that? Our carrot cake is lovely today.', 'Harika seçim! Yanında bir şey yemek ister misin? Havuçlu kekimiz bugün çok güzel.', [{ word: 'lovely', meaning_tr: 'çok güzel, hoş' }]],
    ['Perfect. Is that for here or to take away?', 'Harika. Burada mı yiyeceksin yoksa paket mi?', [{ word: 'to take away', meaning_tr: 'paket, götürmek üzere' }]],
    ["Lovely. That's £6.40, please. Card or cash?", 'Harika. 6,40 sterlin lütfen. Kart mı nakit mi?', [{ word: 'cash', meaning_tr: 'nakit' }]],
    ["Thank you! Here's your receipt. Enjoy your coffee and have a great day!", 'Teşekkürler! Fişin burada. Kahvenin tadını çıkar, iyi günler!', [{ word: 'receipt', meaning_tr: 'fiş' }]],
  ],
  'meet-a-new-friend': [
    ["Nice to meet you! I'm Sam. Where are you from?", 'Tanıştığıma memnun oldum! Ben Sam. Nerelisin?', []],
    ["Oh, cool! I've never been there. What do you like doing in your free time?", 'Aa, harika! Hiç gitmedim. Boş zamanlarında ne yapmayı seversin?', [{ word: 'free time', meaning_tr: 'boş zaman' }]],
    ['That sounds fun! I love football and cooking. Do you want to grab a coffee after class?', 'Kulağa eğlenceli geliyor! Ben futbolu ve yemek yapmayı severim. Dersten sonra kahve içmek ister misin?', [{ word: 'grab a coffee', meaning_tr: 'bir kahve içmek (günlük dil)' }]],
    ['Great, see you at the café at four!', 'Harika, saat dörtte kafede görüşürüz!', []],
  ],
  'airport-check-in': [
    ['Thank you. Are you checking in any bags today?', 'Teşekkürler. Bugün bagaj verecek misiniz?', [{ word: 'check in', meaning_tr: 'bagaj vermek, kayıt yaptırmak' }]],
    ['Please put it on the scale. Would you prefer a window or an aisle seat?', 'Lütfen teraziye koyun. Cam kenarı mı koridor tarafı mı tercih edersiniz?', [{ word: 'aisle seat', meaning_tr: 'koridor koltuğu' }]],
    ["Here's your boarding pass. Boarding starts at 10:40 from gate 23.", 'Biniş kartınız burada. Biniş 10:40\'ta 23 numaralı kapıdan başlıyor.', [{ word: 'gate', meaning_tr: 'kapı (havalimanı)' }]],
    ['Have a pleasant flight!', 'İyi uçuşlar!', []],
  ],
  'job-interview': [
    ['Thanks for coming in. Could you tell me a little about yourself?', 'Geldiğiniz için teşekkürler. Bize biraz kendinizden bahseder misiniz?', []],
    ['Interesting. Why do you want to work with us?', 'İlginç. Neden bizimle çalışmak istiyorsunuz?', []],
    ['What would you say is your biggest strength?', 'En büyük güçlü yanınız nedir?', [{ word: 'strength', meaning_tr: 'güçlü yön' }]],
    ['Great answers. Do you have any questions for us?', 'Harika cevaplar. Bize sormak istediğiniz bir şey var mı?', []],
  ],
}
const FREE: [string, string][] = [
  ['That sounds great! Tell me more — what was the best part?', 'Kulağa harika geliyor! Biraz daha anlat, en güzel kısmı neydi?'],
  ['Interesting! How did you feel about it?', 'İlginç! Bu konuda ne hissettin?'],
  ['Nice! What are you planning to do this weekend?', 'Güzel! Bu hafta sonu ne yapmayı planlıyorsun?'],
  ["You're doing really well. Let's try a new word: \"looking forward to\". What are you looking forward to?", 'Çok iyi gidiyorsun. Yeni bir kalıp deneyelim: "looking forward to" (dört gözle beklemek). Neyi dört gözle bekliyorsun?'],
]

const convs: Record<number, Json> = {}
let badgeShown = false
let nextConv = 100
let nextMsg = 1000

function adaReply(conv: Json, text: string) {
  const turn = conv.messages.filter((m: Json) => m.role === 'user').length
  const script = conv.scenario_key ? SCRIPTS[conv.scenario_key] : null
  const [reply, reply_tr, new_words] = script ? script[Math.min(turn - 1, script.length - 1)] : [...FREE[(turn - 1) % FREE.length], []]
  const goals = conv.meta?.goals ?? []
  const done = goals.length ? Array.from({ length: Math.min(goals.length, turn) }, (_, i) => i) : []
  conv.meta = { ...conv.meta, goals_completed: done }
  return { id: nextMsg++, role: 'assistant', content: reply, feedback: { reply_tr, correction: correct(text), new_words, goals_completed: done }, created_at: new Date().toISOString() }
}

// ---------------------------------------------------------------- router
const ok = (message: string, extra: Json = {}) => ({ message, ...extra })
const usage = () => ({ used: 3, limit: 20, remaining: 17 })

function getRoute(path: string, admin: boolean): Json {
  if (db[path] !== undefined) return db[path]
  const [base, qs = ''] = path.split('?')
  const params = new URLSearchParams(qs)
  if (db[base] !== undefined) return db[base]

  let m
  if ((m = base.match(/^\/ai\/conversations\/(\d+)$/))) {
    const c = convs[+m[1]]
    if (c) return { conversation: c, usage: usage() }
  }
  if (base === '/stories' || base === '/words') {
    const all = structuredClone(db[`${base}?`])
    const q = params.get('q')?.toLowerCase()
    if (q) all.data = all.data.filter((x: Json) => JSON.stringify(x).toLowerCase().includes(q))
    if (params.get('level')) all.data = all.data.filter((x: Json) => x.cefr_level === params.get('level'))
    if (params.get('category')) all.data = all.data.filter((x: Json) => x.category === params.get('category'))
    return all
  }
  if ((m = base.match(/^\/admin\/([a-z-]+)$/))) {
    const all = db[`${base}?page=1`] ?? db[`${base}?per_page=100`]
    if (all) {
      const q = params.get('q')?.toLowerCase()
      return q ? { ...all, data: all.data.filter((x: Json) => JSON.stringify(x).toLowerCase().includes(q)) } : all
    }
  }
  if ((m = base.match(/^\/admin\/users\/(\d+)$/))) return db['/admin/users/1']
  if ((m = base.match(/^\/orders\/(.+)$/))) {
    const plan = db['/plans'].data.find((p: Json) => p.is_featured) ?? db['/plans'].data[0]
    return { order: { uuid: m[1], status: 'paid', total: plan.price, plan } }
  }
  if (F.err[base]) throw new DemoError(F.err[base].status, F.err[base].message)
  if (/^\/(lessons|stories|u|blog|units)\//.test(base)) throw new DemoError(404, 'Bulunamadı.')
  void admin
  return { data: [] }
}

async function postRoute(method: string, path: string, body: Json): Promise<Json> {
  let m
  // --- auth
  if (path === '/auth/login') {
    if (!body.email || !body.password) throw new DemoError(422, 'E-posta ve şifre gerekli.', { email: ['E-posta ve şifre gerekli.'] })
    return { token: 'demo-token', user: me() }
  }
  if (path === '/auth/register') return { token: 'demo-token', user: { ...me(), name: body.name || me().name, email: body.email || me().email, email_verified: false } }
  if (path === '/auth/email/send') return { retry_after: 60 }
  if (path === '/auth/email/verify') return { user: me() }
  if (path === '/auth/forgot-password') return ok('Hesabın varsa, şifre sıfırlama kodunu e-postana gönderdik.')
  if (path === '/auth/reset-password') return { token: 'demo-token', user: me() }
  if (path === '/auth/logout') return null
  if (path === '/auth/admin/challenge') return { method: 'email', retry_after: 60 }
  if (path === '/auth/admin/verify') {
    if (!/^\d{6}$/.test(body.code ?? '')) throw new DemoError(422, 'Kod hatalı.', { code: ['Demo için 6 haneli herhangi bir kod gir (ör. 123456).'] })
    return { token: 'demo-admin-token' }
  }
  if (path === '/contact') return ok('Mesajın bize ulaştı. En geç 1 iş günü içinde dönüş yapacağız.')
  if (path === '/placement') return { level: 'A2', score: 68 }

  // --- learning
  if ((m = path.match(/^\/lessons\/(\d+)\/complete$/))) {
    const id = +m[1]
    const lesson = db[`/lessons/${id}`]?.lesson
    const exercises = lesson?.exercises ?? []
    const answers: Json[] = body.answers ?? []
    const results = exercises.map((ex: Json, i: number) => {
      const a = answers[i]
      if (['choice', 'fill', 'listen_choice', 'dialogue'].includes(ex.type)) return String(a) === String(ex.answer)
      if (['translate', 'listen_type'].includes(ex.type)) {
        const norm = (s: string) => String(s ?? '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim()
        return [ex.answer, ...(ex.alternatives ?? [])].some((x: string) => norm(x) === norm(a))
      }
      if (ex.type === 'spot_error') return a === `${ex.error_index}:${ex.answer}`
      if (ex.type === 'sequence') return Array.isArray(a) && a.length === ex.answer.length && a.every((x: number, k: number) => x === ex.answer[k])
      return true
    })
    const total = results.length
    const correctN = results.filter(Boolean).length
    const score = total ? Math.round((correctN / total) * 100) : 100
    const perfect = score === 100
    const passed = score >= 60
    if (passed) unlockNext(id)
    const hearts = me().hearts
    hearts.hearts = Math.max(0, hearts.hearts - (total - correctN))
    const xp = passed ? (lesson?.xp_reward ?? 15) + (perfect ? 5 : 0) : 3
    const summary = reward(xp, {}, { lessons: passed ? 1 : 0, perfect_lessons: perfect ? 1 : 0 })
    if (passed && !badgeShown) {
      // Show the badge reveal once per demo session with the closest locked badge.
      badgeShown = true
      const a = db['/achievements']?.data?.find((x: Json) => !x.unlocked_at && !x.is_hidden && ['lessons', 'xp', 'perfect'].includes(x.category))
      if (a) {
        a.unlocked_at = new Date().toISOString()
        summary.achievements = [a]
        addGems(a.reward_gems ?? 0)
        summary.gems = me().stats.gems
      }
    }
    return { results, correct: correctN, total, mistakes: total - correctN, score, passed, perfect, first_time: true, reward: summary, hearts }
  }
  if ((m = path.match(/^\/stories\/([^/]+)\/complete$/))) {
    const s = db[`/stories/${m[1]}`]?.story
    const qs = s?.questions ?? []
    const correctN = qs.filter((q: Json, i: number) => (body.answers ?? [])[i] === q.answer).length
    const score = qs.length ? Math.round((correctN / qs.length) * 100) : 100
    return { score, correct: correctN, total: qs.length, reward: reward(20 + (score === 100 ? 5 : 0), {}, { stories: 1 }) }
  }
  if (/^\/stories\/[^/]+\/(progress|rate)$/.test(path)) return ok('ok')
  if (/^\/stories\/[^/]+\/bookmark$/.test(path)) return { bookmarked: true }
  if (path === '/review') return { reviewed: body.reviews?.length ?? 1, reward: reward(2 * (body.reviews?.length ?? 1), {}, { reviews: body.reviews?.length ?? 1 }) }
  if (path === '/words' && method === 'POST') {
    const w = { id: nextMsg++, word: body.word, translation: body.translation ?? null, example: body.example ?? null, source: body.source ?? 'manual', interval_days: 0, repetitions: 0, due_at: new Date().toISOString() }
    db['/words?'].data.unshift(w)
    db['/words?'].stats.total += 1
    return { word: w }
  }
  if ((m = path.match(/^\/words\/(\d+)$/)) && method === 'DELETE') {
    db['/words?'].data = db['/words?'].data.filter((w: Json) => w.id !== +m![1])
    return null
  }

  // --- AI
  if (path === '/ai/conversations') {
    const sc = db['/admin/scenarios?page=1']?.data.find((s: Json) => s.key === body.scenario_key)
    const id = nextConv++
    const opening = sc?.opening_line ?? `Hi ${me().name.split(' ')[0]}! I'm Defne, your English teacher. How's your day going?`
    convs[id] = {
      id, mode: body.mode, scenario_key: sc?.key ?? null, title: sc?.title ?? (body.mode === 'speaking' ? 'Konuşma pratiği' : 'Serbest sohbet'),
      meta: { goals: sc?.goals ?? [], goals_completed: [] },
      messages: [{ id: nextMsg++, role: 'assistant', content: opening, feedback: { new_words: [], correction: null }, created_at: new Date().toISOString() }],
    }
    db['/ai/conversations'].data.unshift({ id, mode: body.mode, scenario_key: sc?.key ?? null, title: convs[id].title, updated_at: new Date().toISOString() })
    return { conversation: convs[id], usage: usage() }
  }
  if ((m = path.match(/^\/ai\/conversations\/(\d+)\/messages$/))) {
    let conv = convs[+m[1]]
    if (!conv) {
      conv = convs[+m[1]] = structuredClone(db[`/ai/conversations/${m[1]}`].conversation)
      const sc = db['/admin/scenarios?page=1']?.data.find((s: Json) => s.key === conv.scenario_key)
      conv.meta = { ...conv.meta, goals: sc?.goals ?? [] }
    }
    conv.messages.push({ id: nextMsg++, role: 'user', content: body.text, feedback: null, created_at: new Date().toISOString() })
    await wait(900)
    const msg = adaReply(conv, body.text)
    conv.messages.push(msg)
    return { message: msg, goals_completed: conv.meta.goals_completed, usage: usage(), reward: reward(3, {}, { ai_messages: 1, speaking: body.spoken ? 1 : 0 }) }
  }
  if (path === '/ai/writing') {
    await wait(1200)
    const text: string = body.text ?? ''
    const mistakes = text.split(/(?<=[.!?])\s+/).map((s) => correct(s)).filter(Boolean).map((c: Json) => ({ original: c.original, fix: c.corrected, rule_tr: c.explanation_tr, category: 'grammar' }))
    const words = text.split(/\s+/).length
    const score = Math.max(45, Math.min(96, 70 + Math.min(20, words / 6) - mistakes.length * 8))
    let fixed = text
    for (const x of mistakes) fixed = fixed.replace(x.original, x.fix)
    return {
      result: {
        cefr_estimate: words > 120 ? 'B1' : 'A2', score: Math.round(score), corrected_text: fixed, mistakes,
        strengths_tr: 'Fikirlerini sıralı anlatıyorsun ve günlük kelimeleri doğru yerde kullanıyorsun.',
        next_steps_tr: 'Cümlelerini "because", "however", "so" gibi bağlaçlarla birleştirmeyi dene; metnin daha akıcı olur.',
      },
      reward: reward(15), usage: usage(),
    }
  }

  // --- game & commerce
  if ((m = path.match(/^\/quests\/(\d+)\/claim$/))) {
    const q = db['/quests'].data.find((x: Json) => x.id === +m![1])
    if (q) q.claimed = true
    addGems(q?.reward_gems ?? 10)
    return { gems: q?.reward_gems ?? 10, item: null }
  }
  if ((m = path.match(/^\/shop\/(\d+)\/buy$/))) {
    const it = db['/shop'].items.find((x: Json) => x.id === +m![1])
    if (!it || me().stats.gems < it.price_gems) throw new DemoError(422, 'Yeterli elmasın yok.')
    addGems(-it.price_gems)
    db['/inventory'].data.unshift({ id: nextMsg++, status: 'available', source: 'shop', code: null, created_at: new Date().toISOString(), item: it })
    return { user: me() }
  }
  if ((m = path.match(/^\/inventory\/(\d+)\/activate$/))) {
    const e = db['/inventory'].data.find((x: Json) => x.id === +m![1])
    if (!e) throw new DemoError(404, 'Kart bulunamadı.')
    e.status = e.item.type === 'streak_freeze' ? 'available' : 'used'
    e.activated_at = new Date().toISOString()
    if (e.item.type === 'chest') {
      addGems(150)
      return { message: 'Sandıktan 150 elmas çıktı!', user: me(), extra: { prize: { item: { item: { icon: 'gem' } } } } }
    }
    if (e.item.type === 'live_lesson' || e.item.type === 'discount_coupon') {
      const code = e.item.type === 'live_lesson' ? 'BDO-7K2M-Q9' : 'OKUL15-X4T8'
      e.code = code
      return { message: 'Kodun hazır! Bayrak Dil Okulları\'nda göstermen yeterli.', user: me(), extra: { code } }
    }
    return { message: `${e.item.name} etkinleştirildi.`, user: me() }
  }
  if (path === '/redeem') {
    if (!body.code) throw new DemoError(422, 'Kod gerekli.', { code: ['Kod gerekli.'] })
    addGems(100)
    return { message: 'Kod kullanıldı: +100 elmas!', user: me() }
  }
  if (path === '/hearts/refill' || path === '/hearts/earn') {
    me().hearts.hearts = 5
    syncUser()
    return { user: me() }
  }
  if (path === '/checkout/quote') return body.coupon ? F.post.quote_coupon ?? F.post.quote : F.post.quote
  if (path === '/checkout') return { order: { uuid: 'demo-order', status: 'paid' }, checkout: null }
  if (path === '/notifications/read') return null

  // --- account
  if (path === '/account' && method === 'PATCH') {
    Object.assign(me(), body, body.preferences ? { preferences: { ...me().preferences, ...body.preferences } } : {})
    syncUser()
    return { user: me() }
  }
  if (path === '/account/2fa/setup') return { secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/DilGO:deniz?secret=JBSWY3DPEHPK3PXP&issuer=DilGO' }
  if (path === '/account/2fa/confirm') return { recovery_codes: ['7F3K-9QPA', 'M2XD-4TLW', 'C8VN-1RZE', 'H6JB-0YUS'] }

  // --- admin
  if ((m = path.match(/^\/admin\/([a-z-]+)(?:\/(\d+))?$/))) {
    const list = db[`/admin/${m[1]}?page=1`]
    if (list) {
      if (method === 'POST') list.data.unshift({ ...body, id: nextMsg++ })
      if (method === 'PUT') Object.assign(list.data.find((r: Json) => r.id === +m![2]) ?? {}, body)
      if (method === 'DELETE') list.data = list.data.filter((r: Json) => r.id !== +m![2])
    }
    return ok('Kaydedildi')
  }
  if (path === '/admin/redeem-codes/generate') return { codes: Array.from({ length: body.count ?? 5 }, (_, i) => `DILGO-${(Math.random() * 1e6).toFixed(0).padStart(6, '0')}${i}`) }
  if (path === '/admin/vouchers') return { code: 'BDO-8H3N-2W', status: 'issued' }

  return ok('Demo modunda kaydedildi.')
}

export async function demoApi<T>(method: string, path: string, body: Json, admin: boolean): Promise<T> {
  await wait(method === 'GET' ? 120 : 280)
  const data = method === 'GET' ? getRoute(path, admin) : await postRoute(method, path, body ?? {})
  return structuredClone(data) as T
}
