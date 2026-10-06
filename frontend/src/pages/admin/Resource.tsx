import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError, del, get, post, put } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea, Toggle } from '@/components/ui/Field'
import { Alert, Modal, Spinner } from '@/components/ui/Misc'
import { useToast } from '@/components/ui/Toast'
import { AdminTitle, Pager, Pill, Table } from './kit'
import { avatarUrl } from '@/lib/avatars'
import { GuideField } from './GuideField'
import { ParagraphsField, QuestionsField, VocabField, type Para, type Question, type Vocab } from './StoryFields'

type Row = Record<string, unknown> & { id: number }
type FieldType = 'text' | 'guide' | 'textarea' | 'number' | 'bool' | 'select' | 'json' | 'date' | 'list' | 'vocab' | 'paragraphs' | 'questions'
interface Field { key: string; label: string; type: FieldType; options?: string[]; hint?: string; full?: boolean }
interface Col { key: string; label: string; render?: (r: Row) => ReactNode }
interface Cfg { title: string; cols: Col[]; fields: Field[]; defaults: Record<string, unknown>; noCreate?: boolean; readOnly?: boolean; preview?: (r: Row) => ReactNode; action?: (r: Row) => ReactNode; intro?: ReactNode }

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const bool = (k: string) => (r: Row) => (r[k] ? <Pill tone="good">evet</Pill> : <Pill>hayır</Pill>)

const EX_HINT = 'Alıştırma dizisi. Tipler: choice, fill, listen_choice (options+answer index) · translate (prompt, answer, alternatives[], tiles[]) · listen_type (audio, answer) · speak (text, translation) · match (pairs [[en,tr],…]) · spot_error (words[], error_index, options[], answer, explanation_tr) · dialogue (scene, lines[{who,text}], options[], answer, note_tr) · sequence (items[] doğru sırada, answer [0,1,2,…])'

const CONFIG: Record<string, Cfg> = {
  courses: {
    title: 'Kurslar',
    cols: [{ key: 'title', label: 'Başlık' }, { key: 'cefr_level', label: 'Seviye' }, { key: 'position', label: 'Sıra' }, { key: 'is_published', label: 'Yayında', render: bool('is_published') }],
    fields: [{ key: 'title', label: 'Başlık', type: 'text' }, { key: 'slug', label: 'Slug', type: 'text' }, { key: 'cefr_level', label: 'Seviye', type: 'select', options: CEFR }, { key: 'color', label: 'Renk', type: 'text' }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_published', label: 'Yayında', type: 'bool' }, { key: 'description', label: 'Açıklama', type: 'textarea', full: true }],
    defaults: { cefr_level: 'A1', color: '#FF5A36', position: 0, is_published: true },
  },
  units: {
    title: 'Üniteler ve rehberler',
    cols: [{ key: 'title', label: 'Başlık' }, { key: 'course', label: 'Kurs', render: (r) => (r.course as { title: string })?.title }, { key: 'guidebook', label: 'Rehber', render: (r) => { const g = String(r.guidebook ?? '').trim(); return g ? <Pill tone="good">{g.split(/\n(?=## )/).length} sayfa</Pill> : <Pill tone="bad">Yok</Pill> } }, { key: 'position', label: 'Sıra' }],
    fields: [{ key: 'course_id', label: 'Kurs ID', type: 'number' }, { key: 'title', label: 'Başlık', type: 'text' }, { key: 'description', label: 'Kısa açıklama', type: 'text' }, { key: 'color', label: 'Renk', type: 'text' }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'guidebook', label: 'Ünite rehberi (uygulamada kitap gibi açılır)', type: 'guide', full: true }],
    defaults: { position: 0 },
  },
  lessons: {
    title: 'Dersler',
    cols: [{ key: 'title', label: 'Başlık' }, { key: 'unit', label: 'Ünite', render: (r) => (r.unit as { title: string })?.title }, { key: 'skill', label: 'Beceri' }, { key: 'kind', label: 'Tür' }, { key: 'xp_reward', label: 'XP' }, { key: 'is_premium', label: 'Premium', render: bool('is_premium') }],
    fields: [{ key: 'unit_id', label: 'Ünite ID', type: 'number' }, { key: 'title', label: 'Başlık', type: 'text' }, { key: 'skill', label: 'Beceri', type: 'select', options: ['reading', 'listening', 'speaking', 'writing', 'vocabulary', 'grammar', 'mixed'] }, { key: 'kind', label: 'Tür', type: 'select', options: ['lesson', 'story', 'ai_talk', 'checkpoint', 'words', 'review', 'quiz'] }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'xp_reward', label: 'XP', type: 'number' }, { key: 'story_id', label: 'Hikaye ID (story türü)', type: 'number' }, { key: 'scenario_key', label: 'AI senaryo anahtarı (ai_talk türü)', type: 'text' }, { key: 'is_premium', label: 'Premium', type: 'bool' }, { key: 'exercises', label: 'Alıştırmalar (JSON)', type: 'json', full: true, hint: EX_HINT }],
    defaults: { skill: 'mixed', kind: 'lesson', position: 0, xp_reward: 15, is_premium: false, exercises: [] },
  },
  stories: {
    title: 'Hikayeler',
    cols: [{ key: 'title', label: 'Başlık' }, { key: 'cefr_level', label: 'Seviye' }, { key: 'category', label: 'Kategori' }, { key: 'reads_count', label: 'Okunma' }, { key: 'is_premium', label: 'Premium', render: bool('is_premium') }, { key: 'is_published', label: 'Yayında', render: bool('is_published') }],
    fields: [
      { key: 'title', label: 'Başlık (EN)', type: 'text' }, { key: 'title_tr', label: 'Başlık (TR)', type: 'text' }, { key: 'slug', label: 'Slug', type: 'text' }, { key: 'cefr_level', label: 'Seviye', type: 'select', options: CEFR },
      { key: 'category', label: 'Kategori', type: 'text' }, { key: 'reading_minutes', label: 'Okuma süresi (dk)', type: 'number' }, { key: 'cover_image', label: 'Kapak görseli URL (boşsa otomatik kapak)', type: 'text' }, { key: 'audio_url', label: 'Ses dosyası URL (isteğe bağlı)', type: 'text' },
      { key: 'is_premium', label: 'Premium', type: 'bool' }, { key: 'is_published', label: 'Yayında', type: 'bool' },
      { key: 'summary', label: 'Özet', type: 'textarea', full: true },
      { key: 'paragraphs', label: 'Sahneler (İngilizce + Türkçe)', type: 'paragraphs', full: true },
      { key: 'vocabulary', label: 'Kelimeler ve Türkçe karşılıkları (okuyucuda dokununca görünür)', type: 'vocab', full: true },
      { key: 'questions', label: 'Anlama soruları (her doğru cevap XP kazandırır)', type: 'questions', full: true },
    ],
    defaults: { cefr_level: 'A1', reading_minutes: 3, is_premium: false, is_published: true, paragraphs: [{ en: '', tr: '' }], vocabulary: [], questions: [] },
  },
  scenarios: {
    title: 'AI senaryoları',
    cols: [{ key: 'emoji', label: '' }, { key: 'title', label: 'Başlık' }, { key: 'category', label: 'Kategori' }, { key: 'cefr_min', label: 'Min.' }, { key: 'is_premium', label: 'Premium', render: bool('is_premium') }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'title', label: 'Başlık', type: 'text' }, { key: 'key', label: 'Anahtar', type: 'text' }, { key: 'emoji', label: 'Emoji', type: 'text' }, { key: 'category', label: 'Kategori', type: 'select', options: ['daily', 'travel', 'career', 'exam', 'fun'] }, { key: 'cefr_min', label: 'Min. seviye', type: 'select', options: CEFR }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_premium', label: 'Premium', type: 'bool' }, { key: 'is_active', label: 'Aktif', type: 'bool' }, { key: 'description', label: 'Açıklama', type: 'text', full: true }, { key: 'opening_line', label: 'Açılış cümlesi (EN)', type: 'text', full: true }, { key: 'system_prompt', label: 'Rol talimatı (EN), Defne bu karaktere bürünür', type: 'textarea', full: true }, { key: 'goals', label: 'Görevler (her satıra bir tane)', type: 'list', full: true }],
    defaults: { category: 'daily', cefr_min: 'A1', is_premium: false, is_active: true, position: 0, goals: [] },
  },
  achievements: {
    title: 'Rozetler',
    cols: [{ key: 'title', label: 'Başlık' }, { key: 'metric', label: 'Metrik' }, { key: 'threshold', label: 'Eşik' }, { key: 'tier', label: 'Kademe' }, { key: 'reward_gems', label: 'Elmas' }],
    fields: [{ key: 'title', label: 'Başlık', type: 'text' }, { key: 'key', label: 'Anahtar', type: 'text' }, { key: 'description', label: 'Açıklama', type: 'text', full: true }, { key: 'category', label: 'Kategori', type: 'text' }, { key: 'metric', label: 'Metrik', type: 'select', options: ['xp_total', 'level', 'streak', 'lessons_completed', 'stories_read', 'words_saved', 'words_mastered', 'ai_messages', 'speaking', 'perfect_lessons', 'reviews', 'goal_days', 'referrals', 'league_top3', 'league_tier'] }, { key: 'threshold', label: 'Eşik', type: 'number' }, { key: 'tier', label: 'Kademe', type: 'select', options: ['bronze', 'silver', 'gold', 'legend'] }, { key: 'icon', label: 'İkon', type: 'select', options: ['flame', 'bolt', 'path', 'book', 'cards', 'brain', 'mic', 'chat', 'target', 'users', 'trophy', 'moon', 'diamond', 'star', 'crown'] }, { key: 'reward_gems', label: 'Ödül elmas', type: 'number' }, { key: 'reward_item_key', label: 'Ödül kartı anahtarı', type: 'text' }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_hidden', label: 'Gizli', type: 'bool' }],
    defaults: { tier: 'bronze', icon: 'star', reward_gems: 10, threshold: 1, metric: 'xp_total', category: 'xp', position: 0, is_hidden: false },
  },
  quests: {
    title: 'Görevler',
    cols: [{ key: 'title', label: 'Başlık' }, { key: 'period', label: 'Dönem' }, { key: 'metric', label: 'Metrik' }, { key: 'target', label: 'Hedef' }, { key: 'reward_gems', label: 'Elmas' }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'title', label: 'Başlık', type: 'text' }, { key: 'key', label: 'Anahtar', type: 'text' }, { key: 'period', label: 'Dönem', type: 'select', options: ['daily', 'weekly'] }, { key: 'metric', label: 'Metrik', type: 'select', options: ['xp', 'lessons', 'stories', 'reviews', 'ai_messages', 'speaking', 'perfect_lessons', 'minutes'] }, { key: 'target', label: 'Hedef', type: 'number' }, { key: 'reward_gems', label: 'Ödül elmas', type: 'number' }, { key: 'reward_xp', label: 'Ödül XP', type: 'number' }, { key: 'reward_item_key', label: 'Ödül kartı anahtarı', type: 'text' }, { key: 'is_active', label: 'Aktif', type: 'bool' }],
    defaults: { period: 'daily', metric: 'xp', target: 10, reward_gems: 10, reward_xp: 0, is_active: true },
  },
  'reward-items': {
    title: 'Ödül kartları',
    cols: [{ key: 'name', label: 'Ad' }, { key: 'type', label: 'Tür' }, { key: 'rarity', label: 'Nadirlik' }, { key: 'price_gems', label: 'Mağaza fiyatı', render: (r) => (r.price_gems ?? '-') as ReactNode }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'name', label: 'Ad', type: 'text' }, { key: 'key', label: 'Anahtar', type: 'text' }, { key: 'type', label: 'Tür', type: 'select', options: ['streak_freeze', 'xp_boost', 'heart_refill', 'premium_days', 'gems', 'live_lesson', 'discount_coupon', 'avatar_frame', 'chest', 'partner_coupon'] }, { key: 'rarity', label: 'Nadirlik', type: 'select', options: ['common', 'rare', 'epic', 'legendary'] }, { key: 'icon', label: 'İkon', type: 'select', options: ['snowflake', 'bolt', 'heart', 'gem', 'crown', 'school', 'ticket', 'frame', 'chest', 'gift', 'star'] }, { key: 'price_gems', label: 'Mağaza fiyatı (boş = satılmaz)', type: 'number' }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_active', label: 'Aktif', type: 'bool' }, { key: 'description', label: 'Açıklama', type: 'text', full: true }, { key: 'value', label: 'Değer (JSON) ör. {"days":7} · {"multiplier":2,"minutes":15} · {"amount":100} · sandık: {"pool":[{"weight":40,"type":"gems","amount":150},{"weight":10,"type":"partner"},{"weight":5,"type":"item","item":"premium_3d"}]}', type: 'json', full: true }],
    defaults: { type: 'gems', rarity: 'common', icon: 'gift', is_active: true, position: 0, value: {} },
  },
  plans: {
    title: 'Paketler',
    cols: [{ key: 'name', label: 'Ad' }, { key: 'tier', label: 'Paket' }, { key: 'interval', label: 'Periyot' }, { key: 'price', label: 'Fiyat' }, { key: 'duration_days', label: 'Gün' }, { key: 'live_lesson_credits', label: 'Canlı ders' }, { key: 'is_featured', label: 'Öne çıkan', render: bool('is_featured') }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'name', label: 'Ad', type: 'text' }, { key: 'slug', label: 'Slug', type: 'text' }, { key: 'tier', label: 'Paket türü (premium, defne, plus)', type: 'select', options: ['premium', 'defne', 'plus'] }, { key: 'tagline', label: 'Slogan', type: 'text' }, { key: 'interval', label: 'Periyot', type: 'select', options: ['month', 'quarter', 'year', 'lifetime'] }, { key: 'duration_days', label: 'Süre (gün)', type: 'number' }, { key: 'price', label: 'Fiyat', type: 'number' }, { key: 'compare_at_price', label: 'Üstü çizili fiyat', type: 'number' }, { key: 'currency', label: 'Para birimi', type: 'text' }, { key: 'bonus_gems', label: 'Bonus elmas', type: 'number' }, { key: 'live_lesson_credits', label: 'Canlı ders kuponu', type: 'number' }, { key: 'badge', label: 'Etiket', type: 'text' }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_featured', label: 'Öne çıkan', type: 'bool' }, { key: 'is_active', label: 'Aktif', type: 'bool' }, { key: 'features', label: 'Özellikler (her satıra bir)', type: 'list', full: true }],
    defaults: { tier: 'premium', interval: 'month', duration_days: 30, currency: 'TRY', bonus_gems: 0, live_lesson_credits: 0, position: 0, is_active: true, is_featured: false, features: [] },
  },
  coupons: {
    title: 'Kuponlar',
    cols: [{ key: 'code', label: 'Kod' }, { key: 'type', label: 'Tür' }, { key: 'value', label: 'Değer' }, { key: 'used_count', label: 'Kullanım', render: (r) => `${r.used_count}/${r.max_uses ?? '∞'}` }, { key: 'expires_at', label: 'Bitiş', render: (r) => (r.expires_at ? String(r.expires_at).slice(0, 10) : '-') }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'code', label: 'Kod', type: 'text' }, { key: 'type', label: 'Tür', type: 'select', options: ['percent', 'fixed'] }, { key: 'value', label: 'Değer (% veya TL)', type: 'number' }, { key: 'max_uses', label: 'Toplam kullanım limiti', type: 'number' }, { key: 'max_uses_per_user', label: 'Kişi başı limit', type: 'number' }, { key: 'min_amount', label: 'Min. tutar', type: 'number' }, { key: 'starts_at', label: 'Başlangıç', type: 'date' }, { key: 'expires_at', label: 'Bitiş', type: 'date' }, { key: 'first_order_only', label: 'Yalnızca ilk sipariş', type: 'bool' }, { key: 'is_active', label: 'Aktif', type: 'bool' }, { key: 'description', label: 'Açıklama', type: 'text', full: true }],
    defaults: { type: 'percent', value: 10, max_uses_per_user: 1, is_active: true, first_order_only: false },
  },
  'blog-posts': {
    title: 'Blog yazıları',
    cols: [{ key: 'title', label: 'Başlık' }, { key: 'category', label: 'Kategori' }, { key: 'published_at', label: 'Yayın', render: (r) => (r.published_at ? String(r.published_at).slice(0, 10) : '-') }, { key: 'is_published', label: 'Yayında', render: bool('is_published') }],
    fields: [{ key: 'title', label: 'Başlık', type: 'text' }, { key: 'slug', label: 'Slug', type: 'text' }, { key: 'category', label: 'Kategori', type: 'text' }, { key: 'author_name', label: 'Yazar', type: 'text' }, { key: 'cover_image', label: 'Kapak görseli URL', type: 'text' }, { key: 'reading_minutes', label: 'Okuma süresi (dk)', type: 'number' }, { key: 'published_at', label: 'Yayın tarihi', type: 'date' }, { key: 'is_published', label: 'Yayında', type: 'bool' }, { key: 'excerpt', label: 'Kısa özet', type: 'text', full: true }, { key: 'body', label: 'İçerik (markdown)', type: 'textarea', full: true }],
    defaults: { category: 'İpuçları', author_name: 'Bayrak Dil Okulları', reading_minutes: 4, is_published: true },
  },
  testimonials: {
    title: 'Öğrenci yorumları',
    cols: [{ key: 'name', label: 'Ad' }, { key: 'role', label: 'Ünvan' }, { key: 'highlight', label: 'Vurgu' }, { key: 'position', label: 'Sıra' }, { key: 'is_published', label: 'Yayında', render: bool('is_published') }],
    fields: [{ key: 'name', label: 'Ad', type: 'text' }, { key: 'role', label: 'Ünvan / meslek', type: 'text' }, { key: 'avatar', label: 'Fotoğraf URL', type: 'text' }, { key: 'highlight', label: 'Vurgu cümlesi (kayan şeritte görünür)', type: 'text', full: true }, { key: 'quote', label: 'Yorum', type: 'textarea', full: true }, { key: 'rating', label: 'Puan (1-5)', type: 'number' }, { key: 'cefr_level', label: 'Seviye', type: 'select', options: ['', ...CEFR] }, { key: 'streak', label: 'Seri (gün)', type: 'number' }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_published', label: 'Yayında', type: 'bool' }],
    defaults: { rating: 5, is_published: true, position: 0 },
  },
  avatars: {
    title: 'Avatarlar',
    cols: [
      { key: 'key', label: 'Görsel', render: (r) => <img src={avatarUrl(String(r.key), r.url as string | null)!} alt="" className="size-12 rounded-xl object-cover" /> },
      { key: 'label', label: 'Ad' },
      { key: 'tier', label: 'Tür', render: (r) => (r.tier === 'premium' ? <Pill tone="warn">Premium</Pill> : <Pill>Standart</Pill>) },
      { key: 'position', label: 'Sıra' },
      { key: 'is_active', label: 'Aktif', render: bool('is_active') },
    ],
    fields: [{ key: 'label', label: 'Ad', type: 'text' }, { key: 'key', label: 'Anahtar', type: 'text' }, { key: 'tier', label: 'Tür', type: 'select', options: ['standard', 'premium'] }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_active', label: 'Aktif', type: 'bool' }],
    defaults: { tier: 'standard', is_active: true, position: 0 },
    noCreate: true,
    intro: <AvatarUpload />,
  },
  'newsletter-subscribers': {
    title: 'Bülten aboneleri',
    noCreate: true,
    intro: (
      <>
        <p className="mb-5 max-w-2xl text-sm text-ink-soft">Çift onaylı liste: yalnızca e-postadaki bağlantıyı açanlar "onaylı" sayılır. Gönderim yalnızca onaylı ve çıkmamış adreslere gider; her e-postaya kişiye özel çıkış bağlantısı otomatik eklenir.</p>
        <NewsletterComposer />
      </>
    ),
    cols: [{ key: 'email', label: 'E-posta' }, { key: 'source', label: 'Kaynak' }, { key: 'confirmed_at', label: 'Onay', render: (r) => (r.confirmed_at ? 'Onaylı' : 'Bekliyor') }, { key: 'unsubscribed_at', label: 'Durum', render: (r) => (r.unsubscribed_at ? 'Çıktı' : 'Aktif') }, { key: 'created_at', label: 'Tarih', render: (r) => String(r.created_at ?? '').slice(0, 10) }],
    fields: [{ key: 'unsubscribed_at', label: 'Çıkış tarihi (listeden çıkarmak için doldur)', type: 'date' }],
    defaults: {},
  },
  'placement-results': {
    title: 'Seviye tespit sonuçları',
    noCreate: true,
    readOnly: true,
    intro: (
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        Seviye tespit sınavını bitiren herkes. Kayıt olmadan çözülen testler "Misafir" görünür, kişi kayıt olunca hesabına bağlanır. Sonuçlar değiştirilemez.
      </p>
    ),
    cols: [
      { key: 'created_at', label: 'Tarih', render: (r) => String(r.created_at ?? '').slice(0, 16).replace('T', ' ') },
      { key: 'user', label: 'Öğrenci', render: (r) => { const u = r.user as { name: string; email: string } | null; return u ? <span><b>{u.name}</b> <span className="text-ink-soft">{u.email}</span></span> : <Pill>Misafir</Pill> } },
      { key: 'level', label: 'Seviye', render: (r) => <Pill tone="good">{String(r.level)}</Pill> },
      { key: 'score', label: 'Puan', render: (r) => `%${r.score}` },
      { key: 'answered', label: 'Cevaplanan' },
    ],
    preview: (r) => <PlacementDetail r={r} />,
    fields: [],
    defaults: {},
  },
  'contact-messages': {
    title: 'İletişim mesajları',
    noCreate: true,
    cols: [{ key: 'name', label: 'Ad' }, { key: 'email', label: 'E-posta' }, { key: 'topic', label: 'Konu' }, { key: 'created_at', label: 'Tarih', render: (r) => String(r.created_at ?? '').slice(0, 10) }, { key: 'status', label: 'Durum', render: (r) => <Pill tone={r.status === 'new' ? 'warn' : 'good'}>{r.status === 'new' ? 'yeni' : r.status === 'replied' ? 'yanıtlandı' : 'kapandı'}</Pill> }],
    preview: (r) => (
      <div className="mb-5 rounded-2xl bg-paper-2 p-4 text-sm">
        <p className="font-bold">{String(r.name)} · <a className="text-sky underline" href={`mailto:${r.email}`}>{String(r.email)}</a>{r.phone ? ` · ${r.phone}` : ''}</p>
        <p className="mt-2 whitespace-pre-line">{String(r.message)}</p>
      </div>
    ),
    fields: [{ key: 'status', label: 'Durum', type: 'select', options: ['new', 'replied', 'closed'] }, { key: 'admin_note', label: 'İç not', type: 'textarea', full: true }],
    defaults: { status: 'new' },
  },
  'school-applications': {
    title: 'Okul başvuruları',
    noCreate: true,
    intro: <p className="mb-5 max-w-2xl text-sm text-ink-soft">"Okullar için" sayfasındaki formdan gelen başvurular. Arayınca durumu güncelle; anlaşma olunca <b>Okul, kurs ve şirketler</b> bölümünden okulu aç.</p>,
    cols: [
      { key: 'school_name', label: 'Okul' },
      { key: 'city', label: 'Şehir' },
      { key: 'students', label: 'Öğrenci' },
      { key: 'contact_name', label: 'Yetkili' },
      { key: 'created_at', label: 'Tarih', render: (r) => String(r.created_at ?? '').slice(0, 10) },
      { key: 'status', label: 'Durum', render: (r) => <Pill tone={r.status === 'new' ? 'warn' : r.status === 'won' ? 'good' : undefined}>{({ new: 'yeni', contacted: 'arandı', demo: 'demo', won: 'anlaşıldı', lost: 'olmadı' } as Record<string, string>)[String(r.status)] ?? String(r.status)}</Pill> },
    ],
    preview: (r) => (
      <div className="mb-5 grid gap-1 rounded-2xl bg-paper-2 p-4 text-sm">
        <p className="font-bold">{String(r.school_name)} · {String(r.city)}{r.district ? ` / ${r.district}` : ''} · {String(r.school_type)} · {String(r.students)} öğrenci</p>
        <p>{String(r.contact_name)} ({String(r.contact_role)}) · <a className="text-sky underline" href={`mailto:${r.email}`}>{String(r.email)}</a> · <a className="text-sky underline" href={`tel:${r.phone}`}>{String(r.phone)}</a></p>
        {Array.isArray(r.grades) && r.grades.length > 0 && <p>Sınıflar: {(r.grades as number[]).join(', ')}</p>}
        {Array.isArray(r.interests) && r.interests.length > 0 && <p>İlgi: {(r.interests as string[]).join(', ')}</p>}
        {!!r.message && <p className="mt-2 whitespace-pre-line">{String(r.message)}</p>}
      </div>
    ),
    fields: [{ key: 'status', label: 'Durum', type: 'select', options: ['new', 'contacted', 'demo', 'won', 'lost'] }, { key: 'admin_note', label: 'İç not', type: 'textarea', full: true }],
    defaults: { status: 'new' },
  },
  institutions: {
    title: 'Kurumlar',
    intro: (
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        Anlaşma yaptığın okul, kurs ve şirketler. Koltuk sayısını belirle; kurum öğrencilerini e-postayla davet eder ya da katılım koduyla ekler. Her kurumun raporunu ve yöneticisini <b>Rapor</b> sayfasından yönet.
      </p>
    ),
    cols: [{ key: 'name', label: 'Kurum' }, { key: 'type', label: 'Tür', render: (r) => ({ school: 'Okul', course: 'Kurs', company: 'Şirket' } as Record<string, string>)[String(r.type)] ?? String(r.type) }, { key: 'city', label: 'Şehir' }, { key: 'seats', label: 'Koltuk' }, { key: 'join_code', label: 'Katılım kodu', render: (r) => <code className="rounded bg-paper-2 px-1.5 py-0.5 text-xs font-bold">{String(r.join_code ?? '-')}</code> }, { key: 'ends_at', label: 'Bitiş', render: (r) => (r.ends_at ? String(r.ends_at).slice(0, 10) : '-') }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    action: (r) => <Link to={`/admin/institutions/${r.id}`} className="inline-flex items-center gap-1 rounded-lg bg-sage/15 px-2 py-1 text-xs font-extrabold text-sage-deep hover:bg-sage/25 dark:text-sage"><BarChart3 className="size-3.5" /> Rapor</Link>,
    fields: [{ key: 'name', label: 'Kurum adı', type: 'text', full: true }, { key: 'type', label: 'Tür', type: 'select', options: ['school', 'course', 'company'] }, { key: 'city', label: 'Şehir', type: 'text' }, { key: 'seats', label: 'Koltuk (öğrenci) sayısı', type: 'number' }, { key: 'is_active', label: 'Aktif', type: 'bool' }, { key: 'starts_at', label: 'Sözleşme başlangıcı', type: 'date' }, { key: 'ends_at', label: 'Sözleşme bitişi', type: 'date' }, { key: 'contact_name', label: 'Yetkili', type: 'text' }, { key: 'contact_email', label: 'Yetkili e-posta', type: 'text' }, { key: 'contact_phone', label: 'Telefon', type: 'text' }, { key: 'logo_url', label: 'Logo (https)', type: 'text' }, { key: 'brand_color', label: 'Kurum rengi (#rrggbb)', type: 'text' }, { key: 'notes', label: 'Notlar', type: 'textarea', full: true }],
    defaults: { type: 'school', seats: 30, is_active: true },
  },
  partners: {
    title: 'İş ortakları',
    intro: (
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        Gizemli sandıktan hediye ve kupon çıkan anlaşmalı markalar. Pasif bir iş ortağının teklifleri sandıktan düşmez. Teklifleri <Link to="/admin/r/partner-offers" className="font-bold underline">Sandık teklifleri</Link> sayfasından yönet.
      </p>
    ),
    cols: [{ key: 'name', label: 'Marka', render: (r) => <span className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: String(r.color ?? '#999') }} />{String(r.name)}</span> }, { key: 'slug', label: 'Kısa ad' }, { key: 'website', label: 'Web', render: (r) => (r.website ? <a href={String(r.website)} target="_blank" rel="noreferrer" className="text-sky underline">aç</a> : '-') }, { key: 'position', label: 'Sıra' }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'name', label: 'Marka adı', type: 'text' }, { key: 'slug', label: 'Kısa ad (a-z, -)', type: 'text' }, { key: 'logo_url', label: 'Logo (https)', type: 'text', full: true }, { key: 'website', label: 'Web sitesi (https)', type: 'text' }, { key: 'color', label: 'Renk (#rrggbb)', type: 'text' }, { key: 'description', label: 'Açıklama', type: 'text', full: true }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_active', label: 'Aktif', type: 'bool' }],
    defaults: { is_active: true, position: 0, color: '#e8403a' },
  },
  'partner-offers': {
    title: 'Sandık teklifleri',
    intro: (
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        Sandıkta "İş ortağı hediyesi" çıktığında bu tekliflerden biri <b>ağırlığına göre</b> seçilir ve öğrenciye tek kullanımlık, kişisel bir kod üretilir. Stok dolunca teklif kendiliğinden düşer. Sandıktaki genel oranları <Link to="/admin/r/reward-items" className="font-bold underline">Ödül kartları</Link> içindeki sandık havuzundan ayarla.
      </p>
    ),
    cols: [{ key: 'title', label: 'Teklif' }, { key: 'partner', label: 'Marka', render: (r) => String((r.partner as Row | null)?.name ?? '-') }, { key: 'rarity', label: 'Nadirlik' }, { key: 'audience', label: 'Kitle', render: (r) => (r.audience === 'adult' ? '18+' : 'Herkes') }, { key: 'weight', label: 'Ağırlık' }, { key: 'stock', label: 'Stok', render: (r) => `${r.awarded ?? 0}/${r.stock ?? '∞'}` }, { key: 'valid_days', label: 'Geçerlilik', render: (r) => `${r.valid_days} gün` }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'partner_id', label: 'İş ortağı ID', type: 'number' }, { key: 'title', label: 'Teklif başlığı', type: 'text' }, { key: 'code_prefix', label: 'Kod ön eki (ör. KHV)', type: 'text' }, { key: 'rarity', label: 'Nadirlik', type: 'select', options: ['common', 'rare', 'epic', 'legendary'] }, { key: 'audience', label: 'Kitle (adult = yalnızca 18+ hesaplar)', type: 'select', options: ['all', 'adult'] }, { key: 'weight', label: 'Ağırlık (yüksek = daha sık)', type: 'number' }, { key: 'stock', label: 'Stok (boş = sınırsız)', type: 'number' }, { key: 'valid_days', label: 'Kod geçerliliği (gün)', type: 'number' }, { key: 'is_active', label: 'Aktif', type: 'bool' }, { key: 'description', label: 'Açıklama', type: 'text', full: true }, { key: 'terms', label: 'Koşullar', type: 'textarea', full: true }],
    defaults: { rarity: 'rare', audience: 'all', weight: 5, valid_days: 30, code_prefix: 'DG', is_active: true },
  },
  'exam-questions': {
    title: 'Sınav soruları',
    intro: (
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        Sınav modundaki soru bankası. Cevap anahtarı öğrenciye gönderilmez, her cevap sunucuda değerlendirilir. Seçenek sırası 0'dan başlar (A = 0). Açıklamayı Türkçe yaz: öğrenci her sorudan sonra görür.
      </p>
    ),
    cols: [{ key: 'prompt', label: 'Soru', render: (r) => <span className="line-clamp-2 max-w-md">{String(r.prompt)}</span> }, { key: 'section', label: 'Bölüm' }, { key: 'exams', label: 'Sınavlar', render: (r) => ((r.exams as string[]) ?? []).map((x) => x.toUpperCase()).join(', ') }, { key: 'cefr', label: 'Seviye' }, { key: 'answer', label: 'Cevap', render: (r) => 'ABCDEF'[Number(r.answer)] }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'section', label: 'Bölüm', type: 'select', options: ['vocabulary', 'grammar', 'cloze', 'sentence_completion', 'translation', 'reading', 'dialogue', 'paragraph', 'irrelevant'] }, { key: 'cefr', label: 'Seviye', type: 'select', options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] }, { key: 'exams', label: 'Sınavlar (her satıra bir: yds, yokdil, ydt, ielts, toefl)', type: 'list' }, { key: 'answer', label: 'Doğru seçenek (0 = A)', type: 'number' }, { key: 'passage', label: 'Okuma parçası (isteğe bağlı)', type: 'textarea', full: true }, { key: 'prompt', label: 'Soru kökü', type: 'textarea', full: true }, { key: 'options', label: 'Seçenekler (her satıra bir)', type: 'list', full: true }, { key: 'explanation', label: 'Türkçe çözüm', type: 'textarea', full: true }, { key: 'position', label: 'Sıra', type: 'number' }, { key: 'is_active', label: 'Aktif', type: 'bool' }],
    defaults: { section: 'grammar', cefr: 'B2', exams: ['yds', 'yokdil', 'ydt'], options: ['', '', '', '', ''], answer: 0, is_active: true, position: 0 },
  },
  'redeem-codes': {
    title: 'Hediye kodları',
    cols: [{ key: 'code', label: 'Kod' }, { key: 'type', label: 'Tür' }, { key: 'amount', label: 'Miktar' }, { key: 'batch', label: 'Parti' }, { key: 'used_count', label: 'Kullanım', render: (r) => `${r.used_count}/${r.max_uses}` }, { key: 'is_active', label: 'Aktif', render: bool('is_active') }],
    fields: [{ key: 'code', label: 'Kod', type: 'text' }, { key: 'type', label: 'Tür', type: 'select', options: ['premium_days', 'gems', 'item'] }, { key: 'amount', label: 'Miktar (gün/elmas)', type: 'number' }, { key: 'reward_item_id', label: 'Kart ID (item türü)', type: 'number' }, { key: 'max_uses', label: 'Kullanım limiti', type: 'number' }, { key: 'batch', label: 'Parti', type: 'text' }, { key: 'expires_at', label: 'Bitiş', type: 'date' }, { key: 'is_active', label: 'Aktif', type: 'bool' }, { key: 'description', label: 'Açıklama', type: 'text', full: true }],
    defaults: { type: 'premium_days', amount: 7, max_uses: 1, is_active: true },
  },
}

/** Compose and send the newsletter: a test to yourself first, then to every confirmed subscriber. */
function NewsletterComposer() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ subject: '', body: '', cta_label: '', cta_url: '', test_email: '' })
  const send = useMutation({
    mutationFn: (test: boolean) => post<{ sent: number; test: boolean }>('/admin/newsletter/send', { subject: f.subject, body: f.body, cta_label: f.cta_label || undefined, cta_url: f.cta_url || undefined, test_email: test ? f.test_email : undefined }),
    onSuccess: (r) => toast(r.test ? 'Deneme e-postası gönderildi' : `${r.sent} aboneye gönderim kuyruğa alındı`, 'success'),
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  if (!open) return <Button className="mb-6" onClick={() => setOpen(true)}>Bülten gönder</Button>
  return (
    <div className="mb-6 max-w-2xl space-y-3 rounded-2xl border-2 border-line bg-card p-5">
      <Input label="Konu" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
      <Textarea label="İçerik (paragrafları boş satırla ayırın)" rows={8} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Düğme metni (isteğe bağlı)" value={f.cta_label} onChange={(e) => setF({ ...f, cta_label: e.target.value })} />
        <Input label="Düğme bağlantısı" value={f.cta_url} onChange={(e) => setF({ ...f, cta_url: e.target.value })} placeholder="https://" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Deneme için e-posta" value={f.test_email} onChange={(e) => setF({ ...f, test_email: e.target.value })} className="min-w-56 flex-1" />
        <Button variant="secondary" loading={send.isPending && send.variables === true} disabled={!f.test_email} onClick={() => send.mutate(true)}>Deneme gönder</Button>
        <Button loading={send.isPending && send.variables === false} onClick={() => confirm('Bülten tüm onaylı abonelere gönderilsin mi?') && send.mutate(false)}>Tüm abonelere gönder</Button>
      </div>
    </div>
  )
}

export default function Resource() {
  const { resource = '' } = useParams()
  const cfg = CONFIG[resource]
  const qc = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  useEffect(() => { setPage(1); setQ(''); setEditing(null) }, [resource])

  const params = new URLSearchParams({ page: String(page), ...(q && { q }) })
  const { data, isLoading } = useQuery({ queryKey: ['res', resource, params.toString()], queryFn: () => get<Paginated<Row>>(`/admin/${resource}?${params}`, true), enabled: !!cfg })
  const remove = useMutation({
    mutationFn: (id: number) => del(`/admin/${resource}/${id}`, true),
    onSuccess: () => { toast('Silindi', 'success'); qc.invalidateQueries({ queryKey: ['res', resource] }) },
    onError: (e: ApiError) => toast(e.message, 'error'),
  })

  if (!cfg) return <p>Bilinmeyen kaynak.</p>
  return (
    <div>
      <AdminTitle title={cfg.title}>
        <Input placeholder="Ara…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="w-full sm:w-56" />
        {!cfg.noCreate && <Button onClick={() => setEditing('new')} icon={<Plus className="size-4" />}>Yeni</Button>}
      </AdminTitle>
      {cfg.intro}
      {isLoading || !data ? <Spinner /> : (
        <>
          {/* phones: one card per record */}
          <div className="grid gap-2 md:hidden">
            {data.data.map((r) => (
              <div key={r.id} className="rounded-2xl border-2 border-line bg-card p-4">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-bold">{cfg.cols[0].render ? cfg.cols[0].render(r) : String(r[cfg.cols[0].key] ?? '-')}</p>
                  {cfg.action?.(r)}
                  <button onClick={() => setEditing(r)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-paper-2" aria-label={cfg.readOnly ? 'Görüntüle' : 'Düzenle'}>{cfg.readOnly ? <Eye className="size-4" /> : <Pencil className="size-4" />}</button>
                  <button onClick={() => confirm('Silinsin mi? Bu işlem geri alınamaz.') && remove.mutate(r.id)} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:text-berry" aria-label="Sil"><Trash2 className="size-4" /></button>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  {cfg.cols.slice(1).map((c) => (
                    <div key={c.key} className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{c.label}</dt><dd className="truncate">{c.render ? c.render(r) : String(r[c.key] ?? '-')}</dd></div>
                  ))}
                </dl>
              </div>
            ))}
            {!data.data.length && <p className="p-6 text-center text-ink-soft">Kayıt yok.</p>}
          </div>
          <div className="hidden md:block">
          <Table head={[...cfg.cols.map((c) => c.label), '']} empty={!data.data.length}>
            {data.data.map((r) => (
              <tr key={r.id} className="hover:bg-paper-2">
                {cfg.cols.map((c) => <td key={c.key} className="px-4 py-2.5">{c.render ? c.render(r) : String(r[c.key] ?? '-')}</td>)}
                <td className="whitespace-nowrap px-4 text-right">
                  {cfg.action && <span className="mr-3">{cfg.action(r)}</span>}
                  <button onClick={() => setEditing(r)} className="mr-3 text-ink-soft hover:text-ink" aria-label={cfg.readOnly ? 'Görüntüle' : 'Düzenle'}>{cfg.readOnly ? <Eye className="size-4" /> : <Pencil className="size-4" />}</button>
                  <button onClick={() => confirm('Silinsin mi? Bu işlem geri alınamaz.') && remove.mutate(r.id)} className="text-ink-soft hover:text-berry" aria-label="Sil"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </Table>
          </div>
          <Pager page={data.current_page} last={data.last_page} onPage={setPage} />
        </>
      )}
      {editing && <Editor key={editing === 'new' ? 'new' : editing.id} resource={resource} cfg={cfg} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Editor({ resource, cfg, row, onClose }: { resource: string; cfg: Cfg; row: Row | null; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const initial = row ?? cfg.defaults
  const [form, setForm] = useState<Record<string, unknown>>(() => ({ ...cfg.defaults, ...initial }))
  const [json, setJson] = useState<Record<string, string>>(() => Object.fromEntries(cfg.fields.filter((f) => f.type === 'json').map((f) => [f.key, JSON.stringify(initial[f.key] ?? null, null, 2)])))
  const [jsonErr, setJsonErr] = useState('')

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => (row ? put(`/admin/${resource}/${row.id}`, body, true) : post(`/admin/${resource}`, body, true)),
    onSuccess: () => { toast('Kaydedildi ✓', 'success'); qc.invalidateQueries({ queryKey: ['res', resource] }); onClose() },
  })
  const err = save.error as ApiError | null

  const submit = () => {
    const body: Record<string, unknown> = {}
    try {
      for (const f of cfg.fields) {
        let v = form[f.key]
        if (f.type === 'json') v = JSON.parse(json[f.key] || 'null')
        if (f.type === 'number') v = v === '' || v === null || v === undefined ? null : Number(v)
        if (f.type === 'date' && !v) v = null
        body[f.key] = v
      }
    } catch {
      return setJsonErr('JSON alanlarından biri geçersiz.')
    }
    setJsonErr('')
    save.mutate(body)
  }

  return (
    <Modal open onClose={onClose} className="sm:!max-w-3xl">
      <h2 className="mb-5 text-2xl font-extrabold">{cfg.readOnly ? 'Ayrıntı' : row ? 'Düzenle' : 'Yeni kayıt'} · {cfg.title}</h2>
      {(err || jsonErr) && <div className="mb-4"><Alert tone="error">{jsonErr || err!.first()}</Alert></div>}
      {row && cfg.preview?.(row)}
      <div className="grid gap-4 sm:grid-cols-2">
        {cfg.fields.map((f) => {
          const cls = f.full ? 'sm:col-span-2' : ''
          const v = form[f.key]
          const set = (x: unknown) => setForm((s) => ({ ...s, [f.key]: x }))
          const fieldErr = err?.errors[f.key]?.[0]
          switch (f.type) {
            case 'bool': return <div key={f.key} className={cls}><Toggle label={f.label} checked={!!v} onChange={set} /></div>
            case 'select': return <Select key={f.key} label={f.label} className={cls} value={String(v ?? '')} onChange={(e) => set(e.target.value)} error={fieldErr}>{f.options!.map((o) => <option key={o}>{o}</option>)}</Select>
            case 'guide': return <div key={f.key} className={cls}><p className="mb-1.5 text-sm font-bold">{f.label}</p><GuideField value={String(v ?? '')} onChange={set} />{fieldErr && <p className="mt-1 text-sm font-semibold text-berry">{fieldErr}</p>}</div>
            case 'textarea': return <Textarea key={f.key} label={f.label} className={cls} value={String(v ?? '')} onChange={(e) => set(e.target.value)} error={fieldErr} rows={8} />
            case 'list': return <Textarea key={f.key} label={f.label} className={cls} value={((v as string[]) ?? []).join('\n')} onChange={(e) => set(e.target.value.split('\n').filter((x, i, a) => x.trim() || i === a.length - 1))} error={fieldErr} />
            case 'json': return <Textarea key={f.key} label={f.label} hint={f.hint} className={`${cls} [&_textarea]:min-h-48 [&_textarea]:font-mono [&_textarea]:text-xs`} value={json[f.key]} onChange={(e) => setJson((s) => ({ ...s, [f.key]: e.target.value }))} error={fieldErr} />
            case 'vocab': return <div key={f.key} className={cls}><p className="mb-1.5 text-sm font-bold">{f.label}</p><VocabField value={(v as Vocab[]) ?? []} onChange={set} paragraphs={(form.paragraphs as Para[]) ?? []} /></div>
            case 'paragraphs': return <div key={f.key} className={cls}><p className="mb-1.5 text-sm font-bold">{f.label}</p><ParagraphsField value={(v as Para[]) ?? []} onChange={set} /></div>
            case 'questions': return <div key={f.key} className={cls}><p className="mb-1.5 text-sm font-bold">{f.label}</p><QuestionsField value={(v as Question[]) ?? []} onChange={set} /></div>
            case 'date': return <Input key={f.key} type="date" label={f.label} className={cls} value={v ? String(v).slice(0, 10) : ''} onChange={(e) => set(e.target.value)} error={fieldErr} />
            case 'number': return <Input key={f.key} type="number" step="any" label={f.label} className={cls} value={v === null || v === undefined ? '' : String(v)} onChange={(e) => set(e.target.value)} error={fieldErr} />
            default: return <Input key={f.key} label={f.label} className={cls} value={String(v ?? '')} onChange={(e) => set(e.target.value)} error={fieldErr} />
          }
        })}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>{cfg.readOnly ? 'Kapat' : 'Vazgeç'}</Button>
        {!cfg.readOnly && <Button loading={save.isPending} onClick={submit}>Kaydet</Button>}
      </div>
    </Modal>
  )
}

/** Upload a new avatar: square PNG, JPG or WebP, 128 to 2048 px, up to 1 MB. */
function AvatarUpload() {
  const qc = useQueryClient()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [tier, setTier] = useState('standard')
  const preview = file ? URL.createObjectURL(file) : null
  const up = useMutation({
    mutationFn: () => {
      const f = new FormData()
      f.append('image', file!)
      f.append('label', label)
      f.append('tier', tier)
      return post('/admin/avatars/upload', f, true)
    },
    onSuccess: () => { toast('Avatar eklendi', 'success'); setFile(null); setLabel(''); qc.invalidateQueries({ queryKey: ['res', 'avatars'] }); qc.invalidateQueries({ queryKey: ['avatars'] }) },
    onError: (e: ApiError) => toast(e.first(), 'error'),
  })
  return (
    <div className="ink-card mb-5 flex flex-wrap items-end gap-4 p-5">
      <label className="grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-line bg-paper-2 text-center text-xs font-bold text-ink-soft hover:border-ink/30">
        {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <>Görsel<br />seç</>}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <div className="grid min-w-56 flex-1 gap-3 sm:grid-cols-2">
        <Input label="Avatar adı" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ör. Kaykaycı" />
        <Select label="Tür" value={tier} onChange={(e) => setTier(e.target.value)}><option value="standard">Standart (herkese açık)</option><option value="premium">Premium</option></Select>
      </div>
      <Button disabled={!file || !label.trim()} loading={up.isPending} onClick={() => up.mutate()}>Yükle</Button>
      <p className="basis-full text-xs text-ink-soft">Kare bir görsel yükle (PNG, JPG veya WebP; 128 ile 2048 piksel arası, en fazla 1 MB). Öğrenciler yeni avatarı profil stüdyosunda hemen görür.</p>
    </div>
  )
}

const SKILL_TR: Record<string, string> = { vocabulary: 'Kelime', grammar: 'Dilbilgisi', reading: 'Okuma', listening: 'Dinleme' }
const KIND_TR: Record<string, string> = { choice: 'Çoktan seçmeli', order: 'Cümle kurma', gap: 'Boşluk yazma', dictation: 'Dikte' }

/** One placement result: bands, the four skills and each activity type. */
function PlacementDetail({ r }: { r: Row }) {
  const bands = (r.bands ?? {}) as Record<string, { total: number; correct: number }>
  const skills = (r.skills ?? {}) as Record<string, number>
  const kinds = (r.activities ?? {}) as Record<string, { total: number; correct: number }>
  const bar = (pct: number) => <span className="block h-2 overflow-hidden rounded-full bg-paper-2"><span className="block h-full rounded-full bg-flame" style={{ width: `${pct}%` }} /></span>
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl bg-paper-2 p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-soft">Bantlar</p>
        {Object.entries(bands).map(([k, b]) => <div key={k} className="mb-1.5 text-sm"><div className="flex justify-between font-bold"><span>{k}</span><span>{b.correct}/{b.total}</span></div>{bar((b.correct / Math.max(1, b.total)) * 100)}</div>)}
      </div>
      <div className="rounded-2xl bg-paper-2 p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-soft">Beceriler</p>
        {Object.entries(skills).map(([k, v]) => <div key={k} className="mb-1.5 text-sm"><div className="flex justify-between font-bold"><span>{SKILL_TR[k] ?? k}</span><span>%{v}</span></div>{bar(v)}</div>)}
      </div>
      <div className="rounded-2xl bg-paper-2 p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-soft">Etkinlikler</p>
        {Object.keys(kinds).length ? Object.entries(kinds).map(([k, b]) => <div key={k} className="mb-1.5 text-sm"><div className="flex justify-between font-bold"><span>{KIND_TR[k] ?? k}</span><span>{b.correct}/{b.total}</span></div>{bar((b.correct / Math.max(1, b.total)) * 100)}</div>) : <p className="text-sm text-ink-soft">Bu test eski sürümle çözülmüş.</p>}
      </div>
    </div>
  )
}
