import type { Me } from './types'

/** Admin panel areas, mirrored from the server's User::PERMISSIONS. */
export const AREAS: { key: string; label: string; text: string }[] = [
  { key: 'users', label: 'Kullanıcılar', text: 'Hesapları görür, düzenler, ödül verir, askıya alır' },
  { key: 'sales', label: 'Satış ve gelir', text: 'Gelir, aboneler, siparişler, iadeler, paketler, kuponlar' },
  { key: 'content', label: 'Eğitim içeriği', text: 'Kurs, ünite, ders, hikâye, sınav soruları, AI senaryoları' },
  { key: 'blog', label: 'Blog ve yorumlar', text: 'Blog yazıları ve öğrenci yorumları' },
  { key: 'gamification', label: 'Oyunlaştırma', text: 'Rozet, görev, ödül kartı, hediye kodu, iş ortakları' },
  { key: 'institutions', label: 'Kurumlar', text: 'Okul, kurs ve şirket hesapları, davetler' },
  { key: 'marketing', label: 'Pazarlama ve iletişim', text: 'Bülten gönderimi, aboneler, iletişim mesajları' },
  { key: 'desk', label: 'Ön büro', text: 'Canlı ders kuponlarını sorgular ve kullanır' },
  { key: 'settings', label: 'Site ayarları', text: 'Özellikler, iletişim, sosyal medya, bakım modu' },
  { key: 'audit', label: 'Denetim kaydı', text: 'Kim ne zaman ne yaptı' },
]

export const ROLES: { key: Me['role']; label: string; text: string }[] = [
  { key: 'user', label: 'Öğrenci', text: 'Panele erişemez' },
  { key: 'support', label: 'Destek', text: 'Varsayılan: kullanıcılar, iletişim, ön büro' },
  { key: 'editor', label: 'Editör', text: 'Varsayılan: eğitim içeriği ve blog' },
  { key: 'admin', label: 'Yönetici', text: 'Varsayılan: rol atama dışında her şey' },
  { key: 'super_admin', label: 'Süper yönetici', text: 'Her şey, rol ve yetki atama dahil' },
]

export const roleLabel = (r?: string) => ROLES.find((x) => x.key === r)?.label ?? r ?? ''
export const can = (u: Me | null | undefined, area?: string) => !area || (u?.permissions ?? []).includes(area)
