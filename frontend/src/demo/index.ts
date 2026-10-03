/**
 * Demo mode: replays responses recorded from a seeded DilGO backend so the whole app can be
 * explored without a server (used for the shareable preview build, VITE_DEMO=1).
 * Mutations update an in-memory copy, and Defne's replies come from a small rule-based script.
 */
import fixture from './fixture.json'
const isPremiumAvatar = (k: string) => ['astronaut', 'wizard', 'king', 'pilot', 'scientist', 'chef', 'jazz', 'detective', 'explorer'].includes(k)

type Json = any // eslint-disable-line @typescript-eslint/no-explicit-any
const F = fixture as { get: Record<string, Json>; post: Record<string, Json>; err: Record<string, { status: number; message: string }>; fresh?: Record<string, Json> }
const db: Record<string, Json> = structuredClone(F.get)

/**
 * Two recorded learners: "deniz" (three weeks in) and "fresh" (just signed up, nothing
 * earned). The fresh one shows every screen exactly as a new account sees it on a real backend.
 */
export type Persona = 'deniz' | 'fresh'
const PKEY = 'dilgo-demo-persona'
export function getPersona(): Persona {
  try { return sessionStorage.getItem(PKEY) === 'fresh' ? 'fresh' : 'deniz' } catch { return 'deniz' }
}
export function setPersona(p: Persona) {
  try { sessionStorage.setItem(PKEY, p) } catch { /* private mode */ }
  for (const k of Object.keys(db)) delete db[k]
  Object.assign(db, structuredClone(F.get), p === 'fresh' ? structuredClone(F.fresh ?? {}) : {})
}
if (getPersona() === 'fresh') setPersona('fresh')
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
/** Mirrors PathService: topics go in order, any topic can be started from its first lesson. */
function unlockNext(lessonId: number) {
  for (const k of Object.keys(db).filter((x) => x === '/path' || x.startsWith('/path/'))) {
    const all = db[k].units.flatMap((u: Json) => u.lessons)
    const hit = all.find((l: Json) => l.id === lessonId)
    if (!hit) continue
    hit.state = 'completed'
    hit.crowns = Math.min(5, (hit.crowns ?? 0) + 1)
    if (db[k].course?.access && db[k].course.access !== 'current') continue
    let cur = false
    for (const u of db[k].units) {
      u.lessons.forEach((l: Json, i: number) => {
        if (l.state === 'completed') return
        l.state = i === 0 || u.lessons[i - 1].state === 'completed' ? 'open' : 'locked'
        if (l.state === 'open' && !cur) { l.state = 'current'; cur = true }
      })
      u.progress = Math.round((u.lessons.filter((l: Json) => l.state === 'completed').length / Math.max(1, u.lessons.length)) * 100)
    }
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
  ['That sounds great! Tell me more, what was the best part?', 'Kulağa harika geliyor! Biraz daha anlat, en güzel kısmı neydi?'],
  ['Interesting! How did you feel about it?', 'İlginç! Bu konuda ne hissettin?'],
  ['Nice! What are you planning to do this weekend?', 'Güzel! Bu hafta sonu ne yapmayı planlıyorsun?'],
  ["You're doing really well. Let's try a new word: \"looking forward to\". What are you looking forward to?", 'Çok iyi gidiyorsun. Yeni bir kalıp deneyelim: "looking forward to" (dört gözle beklemek). Neyi dört gözle bekliyorsun?'],
]

const convs: Record<number, Json> = {}
let activeDuel: Json = null
// Demo arena: a few classmates are "online"; a search finds one of them after ~4 s,
// and their progress in the live match advances on its own.
let queueSince = 0
let liveStart = 0
const liveRival = (): Json => {
  const players = (db['/duel']?.leaderboard ?? []).filter((r: Json) => !r.is_me)
  return players[0] ?? { name: 'Selin Aydın', username: 'selin', avatar: 'braids' }
}
function demoLiveDuel(): Json {
  const d = structuredClone(F.post.duel_start)
  const r = liveRival()
  d.duel.id = nextMsg++
  d.duel.ghost = { ...d.duel.ghost, name: r.name, look: { avatar: r.avatar, avatar_url: r.avatar_url ?? null, frame: r.frame ?? null }, training: false, live: true }
  activeDuel = d.duel
  liveStart = Date.now()
  return d
}

/** Same rules as LessonService::gradeOne on the server. */
function gradeEx(ex: Json, a: Json): boolean {
  const norm = (t: string) => String(t ?? '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (['choice', 'fill', 'listen_choice', 'dialogue'].includes(ex.type)) return String(a) === String(ex.answer)
  if (['translate', 'listen_type', 'order'].includes(ex.type)) return [ex.answer, ...(ex.alternatives ?? [])].some((x: string) => norm(x) === norm(a))
  if (ex.type === 'speak') {
    const w = norm(a).split(' ').filter(Boolean)
    const t = new Set(norm(ex.text).split(' '))
    return w.length > 0 && w.filter((x) => t.has(x)).length / Math.max(w.length, t.size) >= 0.6
  }
  return true
}
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

/** Mirrors RewardService: a weighted roll over the chest's pool, partner gifts drawn from the live offers. */
function rollChest(e: Json) {
  const pool: Json[] = e.item.value?.pool ?? [{ weight: 1, type: 'gems', amount: 150 }]
  let roll = Math.random() * pool.reduce((s: number, p: Json) => s + p.weight, 0)
  const pick = pool.find((p: Json) => (roll -= p.weight) <= 0) ?? pool[0]
  const offers: Json[] = (db['/admin/partner-offers?page=1']?.data ?? []).filter((o: Json) => o.is_active)
  if (pick.type === 'partner' && offers.length) {
    let r = Math.random() * offers.reduce((s: number, o: Json) => s + o.weight, 0)
    const o = offers.find((x: Json) => (r -= x.weight) <= 0) ?? offers[0]
    const partner = (db['/admin/partners?page=1']?.data ?? []).find((p: Json) => p.id === o.partner_id) ?? o.partner ?? {}
    const code = `${o.code_prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    const won = { id: nextMsg++, status: 'active', source: 'chest', code, activated_at: new Date().toISOString(), expires_at: new Date(Date.now() + o.valid_days * 864e5).toISOString(), created_at: new Date().toISOString(),
      item: { name: 'İş ortağı hediyesi', type: 'partner_coupon', icon: 'ticket', rarity: 'epic' },
      meta: { partner: partner.name, partner_logo: partner.logo_url, partner_url: partner.website, color: partner.color, offer: o.title, description: o.description, terms: o.terms, rarity: o.rarity } }
    ;(db['/coupons'] ??= { data: [] }).data.unshift(won)
    return { message: `Sandıktan iş ortağı hediyesi çıktı: ${o.title}!`, user: me(), extra: { prize: { type: 'partner', item: won } } }
  }
  if (pick.type === 'item') {
    const it = (db['/admin/reward-items?per_page=100']?.data ?? db['/admin/reward-items?page=1']?.data ?? []).find((x: Json) => x.key === pick.item)
    if (it) {
      const won = { id: nextMsg++, status: 'available', source: 'chest', code: null, created_at: new Date().toISOString(), item: it }
      db['/inventory'].data.unshift(won)
      return { message: `Sandıktan çıktı: ${it.name}!`, user: me(), extra: { prize: { type: 'item', item: won } } }
    }
  }
  const amount = pick.amount ?? 200
  addGems(amount)
  return { message: `Sandıktan ${amount} elmas çıktı!`, user: me(), extra: { prize: { type: 'gems', amount } } }
}

// ---------------------------------------------------------------- router
const ok = (message: string, extra: Json = {}) => ({ message, ...extra })
const usage = () => ({ used: 3, limit: 20, remaining: 17 })

const AREAS_ALL = ['users', 'sales', 'content', 'blog', 'gamification', 'institutions', 'marketing', 'desk', 'settings', 'audit']
const ROLE_DEFAULT: Record<string, string[]> = { support: ['users', 'marketing', 'desk'], editor: ['content', 'blog'] }


// --- word sets: an in-memory store seeded from the recorded set details
let wsStore: Record<number, Json> | null = null
let wsNext = 5000
function sets(): Record<number, Json> {
  if (!wsStore) {
    wsStore = {}
    for (const [k, v] of Object.entries(db)) if (/^\/word-sets\/\d+$/.test(k)) wsStore[v.data.id] = v.data
  }
  return wsStore
}
const wsCard = (s: Json) => { const { items, plays, ...c } = s; void items; void plays; return c }
function wsList(params: URLSearchParams): Json {
  const scope = params.get('scope') ?? 'explore'
  const q = params.get('q')?.toLocaleLowerCase('tr')
  let all = Object.values(sets())
  all = scope === 'mine' ? all.filter((s) => s.mine) : scope === 'saved' ? all.filter((s) => s.saved) : all.filter((s) => s.official || s.is_public || s.mine)
  if (params.get('level')) all = all.filter((s) => s.level === params.get('level'))
  if (params.get('exam')) all = all.filter((s) => s.exam === params.get('exam'))
  if (q) all = all.filter((s) => `${s.title} ${s.description ?? ''} ${s.exam ?? ''} ${(s.items ?? []).map((i: Json) => `${i.word} ${i.translation}`).join(' ')}`.toLocaleLowerCase('tr').includes(q))
  all.sort((a, b) => Number(!a.official) - Number(!b.official) || String(a.level ?? '').localeCompare(String(b.level ?? '')) || b.id - a.id)
  return { data: all.map(wsCard) }
}
function wsWrite(target: Json | null, body: Json): Json {
  const seen = new Set<string>()
  const items = (body.items ?? []).filter((i: Json) => i.word && !seen.has(i.word.toLowerCase()) && seen.add(i.word.toLowerCase())).map((i: Json, n: number) => ({ id: wsNext + 100 + n, word: i.word, translation: i.translation, example: i.example ?? null, in_library: false }))
  if (items.length < 2) throw new DemoError(422, 'Bir sette en az 2 kelime olmalı.')
  const s = target ?? { id: wsNext++, official: false, mine: true, saved: false, saves_count: 0, plays: 0, category: 'mine', owner: { name: me().name, username: me().username } }
  Object.assign(s, { title: body.title, description: body.description ?? null, level: body.level ?? null, exam: body.exam ?? null, cover: body.cover ?? 'daily', is_public: !!body.is_public, items, words_count: items.length })
  sets()[s.id] = s
  return { data: s }
}

function getRoute(path: string, admin: boolean): Json {
  if (path === '/coupons') return db['/coupons'] ?? { data: [] }
  if (path === '/arena/lobby') {
    const players = (db['/duel']?.leaderboard ?? []).filter((r: Json) => !r.is_me).slice(0, 8)
    const st = ['idle', 'searching', 'playing', 'idle', 'playing', 'idle', 'searching', 'idle']
    return { online: players.length + 1, searching: 2, playing: 2, queue_seconds: 15, players: players.map((p: Json, i: number) => ({ ...p, status: st[i % st.length] })) }
  }
  if (path === '/arena/queue') {
    if (!queueSince) return { status: 'idle' }
    if (Date.now() - queueSince > 4000) {
      queueSince = 0
      const d = demoLiveDuel()
      return { status: 'matched', duel: d.duel, tickets_left: db['/duel']?.me.tickets_left ?? null }
    }
    return { status: 'searching', waited: Math.round((Date.now() - queueSince) / 1000), searching: 2 }
  }
  if (/^\/duel\/\d+\/rival$/.test(path)) {
    const t = (Date.now() - liveStart) / 1000
    const i = Math.min(12, Math.floor(t / 5.2))
    return { rival: { i, score: Math.round(i * 128), finished: i >= 12, connected: true } }
  }
  if (path.startsWith('/word-sets')) {
    const [b, q = ''] = path.split('?')
    if (b === '/word-sets') return wsList(new URLSearchParams(q))
    const s = sets()[+b.split('/')[2]]
    if (!s) throw new DemoError(404, 'Set bulunamadı.')
    return { data: s }
  }
  if (path.startsWith('/words/deck') && /[?&]set=\d+/.test(path)) {
    const s = sets()[+path.match(/[?&]set=(\d+)/)![1]]
    const deck = [...(s?.items ?? [])].sort(() => Math.random() - 0.5).slice(0, 24).map((i: Json) => ({ id: null, word: i.word, translation: i.translation, example: i.example, interval_days: 0 }))
    return { data: deck, saved: 0, set: s ? { id: s.id, title: s.title } : null }
  }
  if (db[path] !== undefined) return db[path]
  const [base, qs = ''] = path.split('?')
  const params = new URLSearchParams(qs)
  if (db[base] !== undefined) return db[base]

  let m
  if (/^\/invites\/[^/]+$/.test(base)) return { institution: { name: 'Demo Koleji', type: 'school', city: 'İzmir' }, email: 'yeni.ogrenci@example.com', name: null, role: 'student' }
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
  if (base === '/exam/practice') return db['/exam/practice?section=mix&n=10']
  if (base === '/words/deck') return db[`/words/deck?n=${params.get('n') ?? 16}&lesson=${params.get('lesson')}`] ?? db[`/words/deck?n=${params.get('n') ?? 16}`] ?? db['/words/deck?n=16']
  if (base === '/institution/leaderboard') return db[`/institution/leaderboard?${params.get('class') ? `class=${encodeURIComponent(params.get('class')!)}&` : ''}period=${params.get('period') ?? 'week'}`] ?? { data: [] }
  if ((m = base.match(/^\/admin\/users\/(\d+)$/))) return db[base] ?? db['/admin/users/1']
  if (base === '/admin/subscribers') {
    const all = db[`/admin/subscribers?status=${params.get('status') ?? 'active'}&page=1`]
    const q = params.get('q')?.toLowerCase()
    const src = params.get('source')
    if (all) return { ...all, data: all.data.filter((x: Json) => (!q || JSON.stringify(x.user).toLowerCase().includes(q)) && (!src || x.source === src)) }
  }
  if ((m = base.match(/^\/admin\/([a-z-]+)\/(\d+)$/))) {
    const row = (db[`/admin/${m[1]}?page=1`]?.data ?? []).find((r: Json) => r.id === +m![2])
    if (row) return { data: row }
  }
  if ((m = base.match(/^\/orders\/(.+)$/))) {
    const plan = db['/plans'].data.find((p: Json) => p.is_featured) ?? db['/plans'].data[0]
    return { order: { uuid: m[1], status: 'paid', total: plan.price, plan } }
  }
  if ((m = base.match(/^\/u\/([^/]+)$/))) {
    // Any learner in the league or arena gets a public profile in the demo.
    const row = [...(db['/league']?.rows ?? []), ...(db['/duel']?.leaderboard ?? [])].find((r: Json) => r.username === m![1])
    if (row) return { user: { name: row.name, username: row.username, avatar: row.avatar, avatar_url: row.avatar_url, frame: row.frame, banner: row.banner, bio: null, cefr_level: row.cefr_level ?? 'A2', xp_total: row.xp * 7, level: 4, streak: row.streak ?? 3, league_tier: db['/league']?.tier ?? 2, league_name: db['/league']?.tier_name, badges_count: 5, is_premium: !!row.is_premium, joined_at: '2026-08-12T10:00:00Z' }, badges: db['/u/elifkaya']?.badges ?? [] }
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
    if (!(body.login ?? body.email) || !body.password) throw new DemoError(422, 'E-posta ve şifre gerekli.', { login: ['E-posta ve şifre gerekli.'] })
    return { token: 'demo-token', user: me() }
  }
  if (path === '/auth/register') {
    // A new sign-up starts from zero, just like on a real backend.
    setPersona('fresh')
    Object.assign(me(), { name: body.name || me().name, email: body.email || me().email, age_group: body.age_group ?? me().age_group, cefr_level: body.cefr_level ?? me().cefr_level, learning_goal: body.learning_goal ?? me().learning_goal, exam_target: body.exam_target ?? null, daily_goal_xp: body.daily_goal_xp ?? me().daily_goal_xp })
    syncUser()
    return { token: 'demo-token', user: { ...me(), email_verified: false } }
  }
  if (path === '/auth/email/send') return { retry_after: 60 }
  if (path === '/auth/email/verify') return { user: me() }
  if (path === '/auth/forgot-password') return ok('Hesabın varsa, şifre sıfırlama kodunu e-postana gönderdik.')
  if (path === '/auth/reset-password') return { token: 'demo-token', user: me() }
  if (path === '/auth/logout') return null
  if ((m = path.match(/^\/coupons\/(\d+)\/used$/))) {
    const c = (db['/coupons']?.data ?? []).find((x: Json) => x.id === +m![1])
    if (!c || c.status !== 'active') throw new DemoError(422, 'Bu kupon artık aktif değil.')
    c.status = 'used'
    c.meta = { ...(c.meta ?? {}), used_at: new Date().toISOString() }
    return { item: c }
  }
  if (path === '/admin/newsletter/send') return { sent: body.test_email ? 1 : 3, test: !!body.test_email }
  if (path === '/newsletter') {
    if (!/^\S+@\S+\.\S+$/.test(body.email ?? '')) throw new DemoError(422, 'Geçerli bir e-posta adresi gir.')
    return ok('Onay bağlantısını e-postana gönderdik. Kutunu kontrol et.')
  }
  if (/^\/newsletter\/confirm\//.test(path)) return ok('Kaydın onaylandı. İlk ipucu yakında kutunda!')
  if (/^\/newsletter\/unsubscribe\//.test(path)) return ok('Bültenden çıktın. Bir daha e-posta göndermeyeceğiz.')
  if (path === '/auth/admin/challenge') return { method: 'email', retry_after: 60 }
  if (path === '/auth/admin/verify') {
    if (!/^\d{6}$/.test(body.code ?? '')) throw new DemoError(422, 'Kod hatalı.', { code: ['Demo için 6 haneli herhangi bir kod gir (ör. 123456).'] })
    return { token: 'demo-admin-token' }
  }
  if ((m = path.match(/^\/auth\/social\/(google|apple)$/))) return { token: 'demo-token', remember: true, user: me() }
  if (path === '/contact') return ok('Mesajın bize ulaştı. En geç 1 iş günü içinde dönüş yapacağız.')
  if (path === '/placement') return { token: 'demo-placement', answered: 37, total: 40 }
  if (path === '/placement/band') return { passed: true }
  if (path === '/word-sets' && method === 'POST') return wsWrite(null, body)
  if ((m = path.match(/^\/word-sets\/(\d+)(?:\/(save|copy|learn|played))?$/))) {
    const s = sets()[+m[1]]
    if (!s) throw new DemoError(404, 'Set bulunamadı.')
    if (!m[2] && method === 'PUT') return wsWrite(s, body)
    if (!m[2] && method === 'DELETE') { delete sets()[s.id]; return { ok: true } }
    if (m[2] === 'save') { s.saved = !s.saved; s.saves_count += s.saved ? 1 : -1; return { saved: s.saved, saves_count: s.saves_count } }
    if (m[2] === 'copy') return wsWrite(null, { ...s, title: `${s.title} (benim)`, is_public: false })
    if (m[2] === 'played') { s.plays = (s.plays ?? 0) + 1; return { ok: true } }
    const fresh = s.items.filter((i: Json) => !i.in_library)
    fresh.forEach((i: Json) => { i.in_library = true; db['/words?']?.data.unshift({ id: nextMsg++, word: i.word, translation: i.translation, example: i.example, source: 'set', interval_days: 0, repetitions: 0, due_at: new Date().toISOString() }) })
    if (db['/words?']) db['/words?'].stats.total += fresh.length
    return { added: fresh.length, message: fresh.length ? `${fresh.length} kelime kütüphanene eklendi.` : 'Bu setin bütün kelimeleri zaten kütüphanende.' }
  }
  if (path === '/placement/claim') return { result: { level: 'B1', score: 64, skills: { vocabulary: 72, grammar: 66, reading: 70, listening: 48 }, bands: {}, activities: { choice: { total: 30, correct: 19 }, order: { total: 5, correct: 3 }, gap: { total: 3, correct: 1 }, dictation: { total: 2, correct: 1 } } }, user: me() }

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
    // Exact spans, like the real API returns, so the lab can mark them in place.
    const mistakes: Json[] = []
    for (const [re, rep, why] of FIXES) {
      for (const hit of text.matchAll(new RegExp(re.source, 'gi'))) {
        const span = hit[0]
        const fix = span.replace(new RegExp(re.source, 'i'), rep).replace('__PAST__', PAST[hit[1]?.toLowerCase()] ?? hit[1]).replace('__BASE__', BASE[hit[1]?.toLowerCase()] ?? hit[1])
        mistakes.push({ original: span, fix, rule_tr: why, category: 'grammar', at: hit.index })
      }
    }
    mistakes.sort((a, b) => a.at - b.at)
    const words = text.split(/\s+/).length
    const score = Math.max(45, Math.min(96, 70 + Math.min(20, words / 6) - mistakes.length * 8))
    let fixed = text
    for (const x of mistakes) fixed = fixed.replace(x.original, x.fix)
    return {
      result: {
        cefr_estimate: words > 120 ? 'B1' : 'A2', score: Math.round(score), corrected_text: fixed, mistakes,
        rubric: { task: Math.min(95, 60 + words), grammar: Math.max(40, 92 - mistakes.length * 12), vocabulary: Math.min(90, 55 + words / 3), organisation: /because|however|so|then/i.test(text) ? 82 : 64 },
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
    const cos = it.value?.frame ?? it.value?.banner
    const mine = me().cosmetics ?? (me().cosmetics = { frames: [], banners: [] })
    if (cos && [...mine.frames, ...mine.banners].includes(cos)) throw new DemoError(422, 'Bu görünüm zaten sende. Profilinden takabilirsin.')
    addGems(-it.price_gems)
    const owned = { id: nextMsg++, status: 'available', source: 'shop', code: null, created_at: new Date().toISOString(), item: it, odds: it.odds }
    db['/inventory'].data.unshift(owned)
    if (it.type === 'avatar_frame') mine.frames.push(it.value.frame)
    if (it.type === 'profile_banner') mine.banners.push(it.value.banner)
    return { user: me(), item: owned }
  }
  if ((m = path.match(/^\/inventory\/(\d+)\/activate$/))) {
    const e = db['/inventory'].data.find((x: Json) => x.id === +m![1])
    if (!e) throw new DemoError(404, 'Kart bulunamadı.')
    e.status = e.item.type === 'streak_freeze' ? 'available' : 'used'
    e.activated_at = new Date().toISOString()
    if (e.item.type === 'chest') return rollChest(e)
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
  // --- live arena
  if (path === '/arena/queue') {
    if (method === 'DELETE') { queueSince = 0; return { ok: true } }
    if (db['/duel']?.me.tickets_left === 0) throw new DemoError(402, 'Bugünkü ücretsiz düello hakların bitti. Yarın yenilenir, ya da Premium ile sınırsız oyna.')
    queueSince = Date.now()
    return { status: 'searching', waited: 0, searching: 2 }
  }
  if (/^\/duel\/\d+\/progress$/.test(path)) {
    const t = (Date.now() - liveStart) / 1000
    const i = Math.min(12, Math.floor(t / 5.2))
    return { rival: { i, score: Math.round(i * 128), finished: i >= 12, connected: true } }
  }
  // --- Gölge Düellosu (graded here the same way the server does)
  if (path === '/duel') {
    const ov = db['/duel']
    if (ov.me.tickets_left === 0) throw new DemoError(402, 'Bugünkü ücretsiz düello hakların bitti. Yarın yenilenir, ya da Premium ile sınırsız oyna.')
    if (ov.me.tickets_left !== null) ov.me.tickets_left--
    const d = structuredClone(F.post.duel_start)
    d.duel.id = nextMsg++
    activeDuel = d.duel
    return d
  }
  if ((m = path.match(/^\/duel\/(\d+)\/finish$/)) && activeDuel) {
    const ov = db['/duel']
    // Same blitz scoring as DuelService::score (speed bonus, combo multiplier up to x2).
    const pts = (ok: boolean, ms: number) => (ok ? 100 + Math.max(0, 60 - Math.floor(ms / 200)) : 0)
    const run = (xs: [boolean, number][]) => {
      let c = 0
      return xs.reduce((s, [ok, ms]) => {
        c = ok ? c + 1 : 0
        return s + Math.round(pts(ok, ms) * (ok ? Math.min(2, 1 + 0.25 * (c - 1)) : 0))
      }, 0)
    }
    const items = activeDuel.rounds.flatMap((r: Json) => r.items.map((it: Json) => ({ ...it, skill: r.skill })))
    const answers: Json[] = body.answers ?? []
    const results = items.map((it: Json, i: number) => (answers[i]?.[1] ?? 12000) <= 13500 && gradeEx(it.ex, answers[i]?.[0]))
    const score = run(items.map((_: Json, i: number) => [results[i], answers[i]?.[1] ?? 12000]))
    const ghost = run(items.map((it: Json) => [it.ghost.correct, it.ghost.ms]))
    const result = score > ghost ? 'win' : score < ghost ? 'loss' : 'draw'
    const delta = result === 'win' ? 24 + Math.min(8, Math.floor((score - ghost) / 60)) : result === 'draw' ? 4 : -Math.min(12, ov.me.trophies)
    const before = ov.me.rank
    ov.me.trophies += delta
    ov.me.best = Math.max(ov.me.best, ov.me.trophies)
    const rank = [...ov.ranks].reverse().find((r: Json) => ov.me.trophies >= r.min)
    ov.me.rank = rank
    ov.me.next_rank = ov.ranks.find((r: Json) => r.min > ov.me.trophies) ?? null
    ov.me[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws']++
    ov.me.win_streak = result === 'win' ? ov.me.win_streak + 1 : 0
    ov.recent.unshift({ id: activeDuel.id, ghost_name: activeDuel.ghost.name, result, score, ghost_score: ghost, delta, at: new Date().toISOString() })
    const correct = results.filter(Boolean).length
    const r = reward(5 + correct * 2 + (result === 'win' ? 5 : 0), {}, { duels: 1 })
    if (result === 'win') addGems(5)
    activeDuel = null
    return {
      result, score, ghost_score: ghost, correct, total: items.length, results, ghost_results: items.map((it: Json) => it.ghost.correct),
      trophies_delta: delta, trophies: ov.me.trophies, rank, rank_up: rank.min > before.min, next_rank: ov.me.next_rank,
      win_streak: ov.me.win_streak, gems: result === 'win' ? 5 : 0, chest: result === 'win' && ov.me.win_streak % 3 === 0, reward: r,
    }
  }

  // --- institutions
  if (path === '/institution/invite' || /^\/admin\/institutions\/\d+\/invite$/.test(path)) {
    const rep = path.startsWith('/admin') ? db[path.replace('/invite', '/report')] : db['/institution']
    const rows: Json[] = body.rows ?? []
    for (const row of rows) {
      rep.members.push({ id: nextMsg++, name: row.name ?? null, email: row.email, class_name: row.class_name ?? null, role: body.role ?? 'student', status: 'invited', invited_at: new Date().toISOString(), joined_at: null, last_active_at: null, cefr_level: null, xp_total: 0, week_xp: 0, streak: 0, lessons: 0, skills: null })
    }
    rep.summary.students += rows.length
    rep.summary.invited += rows.length
    rep.institution.seats_used += rows.length
    return { invited: rows.length, skipped: [] }
  }
  if ((m = path.match(/^\/(?:institution\/members|admin\/institution-members)\/(\d+)$/)) && method === 'DELETE') {
    for (const rep of [db['/institution'], ...Object.keys(db).filter((k) => /^\/admin\/institutions\/\d+\/report$/.test(k)).map((k) => db[k])]) {
      if (rep) rep.members = rep.members.filter((x: Json) => x.id !== +m![1])
    }
    return ok('ok')
  }
  if (path === '/institution/join' || /^\/invites\/[^/]+\/accept$/.test(path)) return { ok: true, user: me() }

  if (path === '/checkout/quote') return body.coupon ? F.post.quote_coupon ?? F.post.quote : F.post.quote
  if (path === '/checkout') return { order: { uuid: 'demo-order', status: 'paid' }, checkout: null }
  if (path === '/notifications/read') {
    for (const n of db['/notifications']?.data ?? []) n.read = true
    if (db['/notifications']) db['/notifications'].unread = 0
    return null
  }
  if ((m = path.match(/^\/notifications\/([^/?]+)\/read$/))) {
    const n = db['/notifications']?.data.find((x: Json) => x.id === m![1])
    if (n && !n.read) { n.read = true; db['/notifications'].unread = Math.max(0, db['/notifications'].unread - 1) }
    return { ok: true }
  }
  if (path.startsWith('/notifications') && method === 'DELETE') {
    const box = db['/notifications']
    const id = path.match(/^\/notifications\/([^/?]+)$/)?.[1]
    box.data = box.data.filter((n: Json) => (id ? n.id !== id : path.includes('read=1') ? !n.read : false))
    box.unread = box.data.filter((n: Json) => !n.read).length
    return { ok: true }
  }

  // --- exam mode: graded against the recorded answer key, like ExamController
  if (path === '/exam/answer') {
    const key = (db['/admin/exam-questions?per_page=100']?.data ?? []).find((q: Json) => q.id === body.question_id)
    const correct = !!key && body.choice === key.answer
    const ov = db['/exam']
    const st = ov?.stats?.find((x: Json) => x.key === key?.section)
    if (ov) {
      ov.total.answered++
      ov.total.today++
    }
    if (st) {
      const right = Math.round(((st.accuracy ?? 0) * st.answered) / 100) + (correct ? 1 : 0)
      st.answered++
      st.accuracy = Math.round((right * 100) / st.answered)
    }
    const r = reward(correct ? 4 : 1, {}, {})
    return { correct, answer: key?.answer ?? 0, explanation: key?.explanation ?? null, xp: r.xp_gained ?? (correct ? 4 : 1) }
  }
  if (path === '/institution' && method === 'PATCH') {
    Object.assign(db['/institution'].institution, body)
    return db['/institution']
  }
  // --- school: classes and homework
  if ((m = path.match(/^\/institution\/classes(?:\/(\d+))?$/))) {
    const inst = db['/institution']
    const list: Json[] = (inst.school_classes ??= [])
    const teacher = (inst.teachers ?? []).find((t: Json) => t.id === body.teacher_member_id)
    if (method === 'DELETE') inst.school_classes = list.filter((c) => c.id !== +m![1])
    else if (m[1]) Object.assign(list.find((c) => c.id === +m![1]) ?? {}, body, { teacher: teacher ? { id: teacher.id, name: teacher.name ?? teacher.email } : null })
    else {
      if (list.some((c) => c.name === body.name)) throw new DemoError(422, 'Bu isimde bir sınıf zaten var.', { name: ['Bu isimde bir sınıf zaten var.'] })
      list.push({ id: nextMsg++, students: 0, ...body, teacher: teacher ? { id: teacher.id, name: teacher.name ?? teacher.email } : null })
    }
    return { ok: true }
  }
  if ((m = path.match(/^\/institution\/assignments(?:\/(\d+))?$/))) {
    const list: Json[] = (db['/institution/assignments'] ??= { data: [] }).data
    if (method === 'DELETE') db['/institution/assignments'].data = list.filter((a) => a.id !== +m![1])
    else {
      const members: Json[] = (db['/institution']?.members ?? []).filter((x: Json) => x.role === 'student' && x.status === 'active' && (!body.class_name || x.class_name === body.class_name))
      const story = (db['/institution/catalog']?.stories ?? []).find((x: Json) => x.slug === body.target)
      const lesson = (db['/institution/catalog']?.lessons ?? []).find((x: Json) => String(x.id) === String(body.target))
      const title = body.title || (story ? `${story.title} hikâyesini oku` : lesson ? lesson.title : { practice: 'Kelime pratiği', exam: 'Sınav denemesi', ai: 'Defne ile konuşma' }[body.kind as string] ?? 'Ödev')
      list.unshift({ id: nextMsg++, title, kind: body.kind, target: body.target, note: body.note, class_name: body.class_name, due_at: body.due_at, created_at: new Date().toISOString(), students: members.length, done: 0, done_ids: [], author: me().name })
    }
    return db['/institution/assignments']
  }
  if ((m = path.match(/^\/me\/assignments\/(\d+)\/done$/))) {
    const a = (db['/me/assignments']?.data ?? []).find((x: Json) => x.id === +m![1])
    if (a) a.done = true
    return db['/me/assignments'] ?? { data: [] }
  }
  // --- subscription
  if (path === '/account/subscription/cancel' || path === '/account/subscription/resume') {
    const sub = db['/account/subscription']
    if (!sub?.current) throw new DemoError(422, 'İptal edilecek aktif bir Premium üyeliğin yok.')
    if (path.endsWith('cancel')) {
      if (body.refund) {
        if (!sub.refund.eligible) throw new DemoError(422, 'Bu üyelik için iade süresi geçmiş ya da ödeme bulunamadı.')
        sub.refund = { ...sub.refund, eligible: false, requested: true }
        if (sub.order) sub.order.refund_requested_at = new Date().toISOString()
      }
      sub.current.cancelled_at = sub.current.cancelled_at ?? new Date().toISOString()
      sub.current.cancel_reason = body.reason
    } else {
      sub.current.cancelled_at = null
      sub.current.cancel_reason = null
      if (sub.refund.requested) sub.refund = { ...sub.refund, eligible: true, requested: false }
      if (sub.order) sub.order.refund_requested_at = null
    }
    return { ...sub, user: me() }
  }

  // --- account
  if (path === '/account' && method === 'PATCH') {
    if (body.avatar && isPremiumAvatar(body.avatar) && !me().premium?.active) throw new DemoError(403, 'Bu avatar Premium üyelere özel.')
    const own = me().cosmetics ?? { frames: [], banners: [] }
    if (body.frame && !own.frames.includes(body.frame)) throw new DemoError(403, 'Önce mağazadan edinmelisin.')
    if (body.banner && !own.banners.includes(body.banner)) throw new DemoError(403, 'Önce mağazadan edinmelisin.')
    // keep the league table in step with the new look
    for (const r of db['/league']?.rows ?? []) if (r.is_me) Object.assign(r, 'frame' in body ? { frame: body.frame } : {}, body.avatar ? { avatar: body.avatar } : {})
    Object.assign(me(), body, body.preferences ? { preferences: { ...me().preferences, ...body.preferences } } : {})
    if (db['/exam'] && 'exam_target' in body) db['/exam'].target = body.exam_target
    if (db['/exam'] && 'exam_date' in body) {
      db['/exam'].exam_date = body.exam_date
      db['/exam'].days_left = body.exam_date ? Math.max(0, Math.round((new Date(body.exam_date).getTime() - Date.now()) / 864e5)) : null
    }
    syncUser()
    return { user: me() }
  }
  if (path === '/account/2fa/setup') return { secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/DilGO:deniz?secret=JBSWY3DPEHPK3PXP&issuer=DilGO' }
  if (path === '/account/2fa/confirm') return { recovery_codes: ['7F3K-9QPA', 'M2XD-4TLW', 'C8VN-1RZE', 'H6JB-0YUS'] }

  // --- admin
  if (path === '/admin/users' && method === 'POST') {
    const id = 9000 + nextMsg++
    const role = body.role ?? 'user'
    const perms = role === 'super_admin' || role === 'admin' ? AREAS_ALL : role === 'user' ? [] : body.permissions ?? ROLE_DEFAULT[role] ?? []
    const base = db['/admin/users/1']
    const detail = { ...base, user: { ...base.user, id, name: body.name, email: body.email, username: String(body.email).split('@')[0], role, permissions: perms, custom_permissions: !!body.permissions, is_staff: role !== 'user', email_verified: !!body.verify_email, stats: { ...base.user.stats, xp_total: 0, gems: 0, streak: 0, streak_longest: 0, level: 1 }, premium: { active: !!body.premium_days, until: body.premium_days ? new Date(Date.now() + body.premium_days * 864e5).toISOString() : null } }, orders: [], items: [], audit: [] }
    db[`/admin/users/${id}`] = detail
    db['/admin/users?page=1']?.data.unshift({ id, name: body.name, email: body.email, username: detail.user.username, role, cefr_level: body.cefr_level ?? 'A1', xp_total: 0, gems: 0, streak_current: 0, premium_until: detail.user.premium.until, is_banned: false, email_verified_at: body.verify_email ? new Date().toISOString() : null, created_at: new Date().toISOString() })
    if (role !== 'user') db['/admin/staff']?.data.push({ id, name: body.name, email: body.email, role, permissions: perms, custom: !!body.permissions, two_factor: false, last_login_at: null })
    return detail
  }
  if ((m = path.match(/^\/admin\/users\/(\d+)$/)) && method === 'PATCH') {
    const key = `/admin/users/${m[1]}`
    const d = structuredClone(db[key] ?? db['/admin/users/1'])
    const role = body.role ?? d.user.role
    if ('role' in body || 'permissions' in body) {
      d.user.role = role
      d.user.custom_permissions = Array.isArray(body.permissions)
      d.user.permissions = role === 'super_admin' || (role === 'admin' && !Array.isArray(body.permissions)) ? AREAS_ALL : role === 'user' ? [] : Array.isArray(body.permissions) ? body.permissions : ROLE_DEFAULT[role] ?? []
      const st = db['/admin/staff']?.data.find((x: Json) => x.id === +m![1])
      if (st) Object.assign(st, { role, permissions: d.user.permissions, custom: d.user.custom_permissions })
    }
    if ('is_banned' in body) d.user.is_banned = body.is_banned
    if (body.gems_delta) d.user.stats.gems = Math.max(0, d.user.stats.gems + body.gems_delta)
    if (body.verify_email) d.user.email_verified = true
    db[key] = d
    return d
  }
  if ((m = path.match(/^\/admin\/([a-z-]+)(?:\/(\d+))?$/))) {
    const list = db[`/admin/${m[1]}?page=1`]
    if (list) {
      let row: Json | undefined
      if (method === 'POST') list.data.unshift((row = { ...body, id: 5000 + nextMsg++, published_at: body.published_at ?? (body.is_published ? new Date().toISOString() : null) }))
      if (method === 'PUT') row = Object.assign(list.data.find((r: Json) => r.id === +m![2]) ?? {}, body)
      if (method === 'DELETE') list.data = list.data.filter((r: Json) => r.id !== +m![2])
      if (row) return { ...ok('Kaydedildi'), data: row }
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
