import { useQuery } from '@tanstack/react-query'
import { get } from './api'
import type { ExamKey } from './types'

export interface SiteConfig {
  brand: string
  school: string
  support_email: string
  registration_open: boolean
  maintenance: boolean
  announcement: string | null
  captcha: boolean
  school_cta_url: string | null
  school_whatsapp: string | null
  site?: {
    brand?: { tagline?: string | null }
    contact?: { email?: string | null; phone?: string | null; address?: string | null }
    social?: Partial<Record<'instagram' | 'youtube' | 'tiktok' | 'linkedin' | 'x', string | null>>
    seo?: { description?: string | null }
    features?: Partial<Record<'duel' | 'ai' | 'stories' | 'exam' | 'chest_partners' | 'social_login' | 'leagues', boolean>>
  }
  social_login?: { google: string | null; apple: string | null }
  exams?: { key: ExamKey; name: string; full: string; about: string }[]
}

/** Public site configuration (brand, contact, feature switches) managed from the admin panel. */
export function useSiteConfig() {
  return useQuery({ queryKey: ['config'], queryFn: () => get<SiteConfig>('/config'), staleTime: 600_000 })
}

/** A feature is on unless the admin switched it off. */
export function useFeature(key: keyof NonNullable<NonNullable<SiteConfig['site']>['features']>) {
  const { data } = useSiteConfig()
  return data?.site?.features?.[key] !== false
}
