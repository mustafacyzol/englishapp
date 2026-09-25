export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type Skill = 'reading' | 'listening' | 'speaking' | 'writing' | 'vocabulary' | 'grammar' | 'mixed'

export interface Me {
  id: number
  name: string
  username: string
  email: string
  email_verified: boolean
  role: 'user' | 'editor' | 'admin' | 'super_admin'
  is_staff: boolean
  avatar: string | null
  cefr_level: Cefr
  learning_goal: string | null
  daily_goal_xp: number
  onboarded: boolean
  preferences: { email_reminders?: boolean; sound?: boolean; tts_rate?: number; tts_voice?: string; theme?: 'light' | 'dark' | 'system'; frame?: string }
  marketing_opt_in: boolean
  two_factor_enabled: boolean
  referral_code: string
  premium: { active: boolean; until: string | null }
  stats: {
    xp_total: number
    level: number
    level_floor: number
    level_ceil: number
    gems: number
    streak: number
    streak_longest: number
    league_tier: number
    league_name: string
  }
  hearts: { hearts: number; unlimited: boolean; next_heart_at: string | null }
  created_at: string
}

export interface RewardSummary {
  xp_gained: number
  multiplier: number
  xp_total: number
  level: number
  level_up: boolean
  streak: number
  streak_extended: boolean
  daily_xp: number
  daily_goal: number
  goal_met_now: boolean
  quests_completed: { id: number; title: string; reward_gems: number }[]
  achievements: Achievement[]
  gems: number
}

export interface Achievement {
  id: number
  key: string
  title: string
  description: string
  tier: 'bronze' | 'silver' | 'gold' | 'legend'
  icon: string
  category?: string
  threshold?: number
  progress?: number
  reward_gems?: number
  unlocked_at?: string | null
}

export type Exercise =
  | { type: 'choice'; prompt: string; options: string[]; answer: number; audio?: string }
  | { type: 'fill'; prompt: string; options: string[]; answer: number; hint?: string }
  | { type: 'listen_choice'; prompt: string; audio: string; options: string[]; answer: number }
  | { type: 'translate'; prompt: string; answer: string; alternatives: string[]; tiles: string[] }
  | { type: 'listen_type'; prompt: string; audio: string; answer: string }
  | { type: 'speak'; prompt: string; text: string; translation?: string }
  | { type: 'match'; prompt: string; pairs: [string, string][] }

export interface PathLesson {
  id: number
  title: string
  skill: Skill
  kind: 'lesson' | 'story' | 'ai_talk' | 'checkpoint'
  xp_reward: number
  is_premium: boolean
  premium_locked: boolean
  story_id: number | null
  story?: { id: number; slug: string } | null
  scenario_key: string | null
  state: 'completed' | 'current' | 'locked'
  crowns: number
  best_score: number
}

export interface PathUnit {
  id: number
  title: string
  description: string
  color: string | null
  has_guidebook: boolean
  lessons: PathLesson[]
  progress: number
}

export interface StoryCard {
  id: number
  slug: string
  title: string
  title_tr: string | null
  summary: string | null
  cefr_level: Cefr
  category: string | null
  cover_image: string | null
  reading_minutes: number
  word_count: number
  is_premium: boolean
  has_audio?: boolean
  progress?: number
  completed?: boolean
  bookmarked?: boolean
}

export interface Story extends StoryCard {
  audio_url: string | null
  paragraphs: { en: string; tr?: string }[]
  vocabulary: { word: string; meaning: string; example?: string }[] | null
  questions: { q: string; options: string[]; answer: number }[] | null
}

export interface RewardItem {
  id: number
  key: string
  name: string
  description: string | null
  type: string
  value: Record<string, unknown> | null
  price_gems: number | null
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface UserItem {
  id: number
  status: 'available' | 'active' | 'used' | 'expired'
  source: string
  code: string | null
  activated_at: string | null
  expires_at: string | null
  created_at: string
  item: RewardItem
}

export interface Plan {
  id: number
  slug: string
  name: string
  tagline: string | null
  interval: string
  duration_days: number
  price: string
  compare_at_price: string | null
  currency: string
  features: string[] | null
  badge: string | null
  bonus_gems: number
  live_lesson_credits: number
  is_featured: boolean
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}
