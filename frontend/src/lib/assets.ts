/** Resolve a bundled image under public/img (works for web, native and relative-base builds). */
export const img = (path: string) => `${import.meta.env.BASE_URL}img/${path}`

export const PHOTO = {
  hero: img('photos/hero.webp'),
  ada: img('photos/ada.webp'),
  adaWave: img('photos/ada-wave.webp'),
  auth: img('photos/auth.webp'),
  classroom: img('photos/classroom.webp'),
  team: img('photos/team.webp'),
  reception: img('photos/reception.webp'),
  read: img('photos/skill-read.webp'),
  listen: img('photos/skill-listen.webp'),
  speak: img('photos/skill-speak.webp'),
  write: img('photos/skill-write.webp'),
}

/**
 * One cohesive 3D icon set lives in public/img/rewards. These are the file names;
 * REWARD_ICON maps the `icon` values the API uses for reward items onto them.
 */
const REWARD_FILES = ['flame', 'heart', 'gems', 'boost', 'freeze', 'chest', 'crown', 'voucher', 'coupon', 'frame', 'star', 'trophy'] as const
export type RewardIcon = (typeof REWARD_FILES)[number]

const REWARD_ICON: Record<string, RewardIcon> = {
  snowflake: 'freeze',
  bolt: 'boost',
  heart: 'heart',
  gem: 'gems',
  gems: 'gems',
  crown: 'crown',
  school: 'voucher',
  ticket: 'coupon',
  frame: 'frame',
  chest: 'chest',
  gift: 'chest',
  flame: 'flame',
  star: 'star',
  trophy: 'trophy',
  diamond: 'gems',
  moon: 'star',
}

/** Accepts either an API icon key ("snowflake") or a file name ("freeze"). */
export function rewardImg(icon: string) {
  const mapped = REWARD_ICON[icon] ?? ((REWARD_FILES as readonly string[]).includes(icon) ? (icon as RewardIcon) : 'chest')
  return img(`rewards/${mapped}.webp`)
}

const BADGES = ['streak', 'xp', 'lessons', 'stories', 'words', 'mastery', 'speaking', 'ai', 'perfect', 'social', 'league', 'secret']
export const badgeImg = (category: string) => img(`badges/${BADGES.includes(category) ? category : 'xp'}.webp`)
export const leagueImg = (tier: number) => img(`leagues/${Math.max(0, Math.min(9, tier))}.webp`)
export const scenarioImg = (key: string) => img(`scenarios/${key}.webp`)
export const storyImg = (slug: string) => img(`stories/${slug}.webp`)

const UNIT_PHOTOS = ['scenarios/meet-a-new-friend', 'scenarios/order-at-a-cafe', 'stories/mias-first-day-in-london', 'photos/hero', 'scenarios/weekend-story', 'stories/the-lighthouse-keepers-letter', 'photos/classroom']
export const unitImg = (index: number) => img(`${UNIT_PHOTOS[index % UNIT_PHOTOS.length]}.webp`)

/** Content images come from the API as '/img/...' (bundled) or absolute URLs (uploaded). */
export const media = (path?: string | null) => (!path ? '' : path.startsWith('/img/') ? img(path.slice(5)) : path)
