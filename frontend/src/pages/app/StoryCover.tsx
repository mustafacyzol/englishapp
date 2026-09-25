import clsx from 'clsx'
import type { StoryCard } from '@/lib/types'
import { media, storyImg } from '@/lib/assets'
import { Img } from '@/components/ui/Img'

export function StoryCover({ story, className }: { story: Pick<StoryCard, 'slug' | 'title' | 'cefr_level' | 'cover_image' | 'category'>; className?: string }) {
  return <Img src={media(story.cover_image) || storyImg(story.slug)} alt="" loading="lazy" className={clsx('size-full object-cover', className)} />
}
