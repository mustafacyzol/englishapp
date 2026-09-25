import {
  Award, BookOpen, Zap, Brain, Crown, Diamond, Flame, Frame, Gem, Gift, GraduationCap, Heart, Layers, MessagesSquare, Mic, Moon,
  Package, Route, Snowflake, Star, Target, Ticket, Trophy, Users, type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  flame: Flame, bolt: Zap, path: Route, book: BookOpen, cards: Layers, brain: Brain, mic: Mic, chat: MessagesSquare,
  target: Target, users: Users, trophy: Trophy, moon: Moon, diamond: Diamond, snowflake: Snowflake, heart: Heart,
  gem: Gem, crown: Crown, school: GraduationCap, ticket: Ticket, frame: Frame, chest: Package, star: Star, gift: Gift, award: Award,
}

export const iconFor = (key: string): LucideIcon => ICONS[key] ?? Star
