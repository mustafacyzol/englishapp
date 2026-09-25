import clsx from 'clsx'
import type { StoryCard } from '@/lib/types'
import { media, storyImg } from '@/lib/assets'

export function StoryCover({ story, className }: { story: Pick<StoryCard, 'slug' | 'title' | 'cefr_level' | 'cover_image' | 'category'>; className?: string }) {
  return <img src={media(story.cover_image) || storyImg(story.slug)} alt="" loading="lazy" className={clsx('size-full object-cover', className)} />
}
