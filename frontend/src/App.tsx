import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Spinner } from './components/ui/Misc'
import AppLayout from './layouts/AppLayout'
import AdminLayout from './layouts/AdminLayout'
import PublicLayout from './layouts/PublicLayout'
import { setMuted } from './lib/fx'
import { DEMO } from './lib/api'

const DemoBar = lazy(() => import('./demo/DemoBar').then((m) => ({ default: m.DemoBar })))

const Landing = lazy(() => import('./pages/public/Landing'))
const Legal = lazy(() => import('./pages/public/Legal'))
const About = lazy(() => import('./pages/public/About'))
const Contact = lazy(() => import('./pages/public/Contact'))
const BlogList = lazy(() => import('./pages/public/Blog').then((m) => ({ default: m.BlogList })))
const BlogPost = lazy(() => import('./pages/public/Blog').then((m) => ({ default: m.BlogPost })))
const Placement = lazy(() => import('./pages/public/Placement'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))

const Learn = lazy(() => import('./pages/app/Learn'))
const LessonPlayer = lazy(() => import('./pages/app/LessonPlayer'))
const Stories = lazy(() => import('./pages/app/Stories'))
const StoryReader = lazy(() => import('./pages/app/StoryReader'))
const Practice = lazy(() => import('./pages/app/Practice'))
const AiHub = lazy(() => import('./pages/app/AiHub'))
const AiChat = lazy(() => import('./pages/app/AiChat'))
const WritingLab = lazy(() => import('./pages/app/WritingLab'))
const Leagues = lazy(() => import('./pages/app/Leagues'))
const Quests = lazy(() => import('./pages/app/Quests'))
const Profile = lazy(() => import('./pages/app/Profile'))
const Achievements = lazy(() => import('./pages/app/Achievements'))
const Shop = lazy(() => import('./pages/app/Shop'))
const Rewards = lazy(() => import('./pages/app/Rewards'))
const Premium = lazy(() => import('./pages/app/Premium'))
const PremiumResult = lazy(() => import('./pages/app/PremiumResult'))
const Settings = lazy(() => import('./pages/app/Settings'))
const Notifications = lazy(() => import('./pages/app/Notifications'))
const PublicProfile = lazy(() => import('./pages/app/PublicProfile'))

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminUser = lazy(() => import('./pages/admin/UserDetail'))
const AdminResource = lazy(() => import('./pages/admin/Resource'))
const AdminOrders = lazy(() => import('./pages/admin/Orders'))
const AdminVouchers = lazy(() => import('./pages/admin/Vouchers'))
const AdminCodes = lazy(() => import('./pages/admin/CodeGenerator'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const AdminAudit = lazy(() => import('./pages/admin/Audit'))

function Guard({ children, verified = true, guest }: { children: ReactNode; verified?: boolean; guest?: boolean }) {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <Spinner />
  if (guest) return user ? <Navigate to={user.email_verified ? '/learn' : '/verify-email'} replace /> : <>{children}</>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (verified && !user.email_verified) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()
  useEffect(() => setMuted(user?.preferences?.sound === false), [user?.preferences?.sound])

  return (
    <Suspense fallback={<Spinner />}>
      {DEMO && <DemoBar />}
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={user ? <Navigate to="/learn" replace /> : <Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
        </Route>
        <Route path="/placement" element={<Placement />} />
        <Route path="/r/:code" element={<Register />} />
        <Route path="/login" element={<Guard guest><Login /></Guard>} />
        <Route path="/register" element={<Guard guest><Register /></Guard>} />
        <Route path="/forgot-password" element={<Guard guest><ForgotPassword /></Guard>} />
        <Route path="/verify-email" element={<Guard verified={false}><VerifyEmail /></Guard>} />

        <Route path="/lesson/:id" element={<Guard><LessonPlayer /></Guard>} />
        <Route element={<Guard><AppLayout /></Guard>}>
          <Route path="/learn" element={<Learn />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/stories/:slug" element={<StoryReader />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/ai" element={<AiHub />} />
          <Route path="/ai/writing" element={<WritingLab />} />
          <Route path="/ai/:id" element={<AiChat />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/achievements" element={<Achievements />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/premium/result" element={<PremiumResult />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/u/:username" element={<PublicProfile />} />
        </Route>

        <Route path="/admin" element={<Guard><AdminLayout /></Guard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUser />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="codes" element={<AdminCodes />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="r/:resource" element={<AdminResource />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
