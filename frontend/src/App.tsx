import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PageBoundary } from './components/ui/PageBoundary'
import { RouteSeo } from './lib/seo'
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
const Newsletter = lazy(() => import('./pages/public/Newsletter'))
const NotFound = lazy(() => import('./pages/public/NotFound'))
const BlogList = lazy(() => import('./pages/public/Blog').then((m) => ({ default: m.BlogList })))
const BlogPost = lazy(() => import('./pages/public/Blog').then((m) => ({ default: m.BlogPost })))
const Placement = lazy(() => import('./pages/public/Placement'))
const Schools = lazy(() => import('./pages/public/Schools'))
const Help = lazy(() => import('./pages/public/Help'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))

const Learn = lazy(() => import('./pages/app/Learn'))
const LessonPlayer = lazy(() => import('./pages/app/LessonPlayer'))
const Stories = lazy(() => import('./pages/app/Stories'))
const StoryReader = lazy(() => import('./pages/app/StoryReader'))
const Practice = lazy(() => import('./pages/app/Practice'))
const TrackSetup = lazy(() => import('./pages/app/TrackSetup'))
const SetDetail = lazy(() => import('./pages/app/WordSets').then((m) => ({ default: m.SetDetailPage })))
const SetEditor = lazy(() => import('./pages/app/WordSets').then((m) => ({ default: m.SetEditorPage })))
const AiHub = lazy(() => import('./pages/app/AiHub'))
const Duel = lazy(() => import('./pages/app/Duel'))
const Exam = lazy(() => import('./pages/app/Exam'))
const InstitutionLayout = lazy(() => import('./layouts/InstitutionLayout'))
const InstOverview = lazy(() => import('./pages/institution/Panel').then((m) => ({ default: m.InstitutionOverview })))
const InstStudents = lazy(() => import('./pages/institution/Panel').then((m) => ({ default: m.InstitutionStudents })))
const InstClasses = lazy(() => import('./pages/institution/Panel').then((m) => ({ default: m.InstitutionClasses })))
const InstInvites = lazy(() => import('./pages/institution/Panel').then((m) => ({ default: m.InstitutionInvites })))
const InstSettings = lazy(() => import('./pages/institution/Panel').then((m) => ({ default: m.InstitutionSettings })))
const SchoolHomework = lazy(() => import('./pages/institution/School').then((m) => ({ default: m.SchoolHomework })))
const SchoolTeachers = lazy(() => import('./pages/institution/School').then((m) => ({ default: m.SchoolTeachers })))
const InstitutionDetail = lazy(() => import('./pages/admin/InstitutionDetail'))
const Invite = lazy(() => import('./pages/institution/Invite'))
const AiChat = lazy(() => import('./pages/app/AiChat'))
const WritingLab = lazy(() => import('./pages/app/WritingLab'))
const Leagues = lazy(() => import('./pages/app/Leagues'))
const Quests = lazy(() => import('./pages/app/Quests'))
const Profile = lazy(() => import('./pages/app/Profile'))
const Achievements = lazy(() => import('./pages/app/Achievements'))
const Shop = lazy(() => import('./pages/app/Shop'))
const Rewards = lazy(() => import('./pages/app/Rewards'))
const Coupons = lazy(() => import('./pages/app/Coupons'))
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
const AdminIntegrations = lazy(() => import('./pages/admin/Integrations'))
const AdminAudit = lazy(() => import('./pages/admin/Audit'))
const AdminRevenue = lazy(() => import('./pages/admin/Revenue'))
const AdminSubscribers = lazy(() => import('./pages/admin/Subscribers'))
const AdminStaff = lazy(() => import('./pages/admin/Staff'))
const AdminBlogList = lazy(() => import('./pages/admin/BlogEditor').then((m) => ({ default: m.BlogList })))
const AdminBlogEdit = lazy(() => import('./pages/admin/BlogEditor').then((m) => ({ default: m.BlogEdit })))

function Guard({ children, verified = true, guest }: { children: ReactNode; verified?: boolean; guest?: boolean }) {
  const { user, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <Spinner />
  if (guest) return user ? <Navigate to={user.email_verified ? '/learn' : '/verify-email'} replace /> : <>{children}</>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (verified && !user.email_verified) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

/**
 * Every page is its own chunk; once the first screen is up, the rest are fetched
 * quietly in the background so later navigation is instant (no loading flash).
 */
const PAGES = import.meta.glob(['./pages/app/*.tsx', './pages/public/*.tsx', './pages/auth/*.tsx', './layouts/*.tsx'])
const ADMIN_PAGES = import.meta.glob(['./pages/admin/*.tsx', './pages/institution/*.tsx'])
function usePreloadPages(staff: boolean) {
  useEffect(() => {
    const run = () => {
      const all = [...Object.values(PAGES), ...(staff ? Object.values(ADMIN_PAGES) : [])]
      // a few at a time, so the first screen keeps the network to itself
      let i = 0
      const next = () => { const batch = all.slice(i, (i += 4)); if (batch.length) Promise.allSettled(batch.map((f) => f())).then(next) }
      next()
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number }
    const t = w.requestIdleCallback ? w.requestIdleCallback(run) : window.setTimeout(run, 1500)
    return () => { if (!w.requestIdleCallback) clearTimeout(t) }
  }, [staff])
}

export default function App() {
  const { user } = useAuth()
  useEffect(() => setMuted(user?.preferences?.sound === false), [user?.preferences?.sound])
  usePreloadPages(!!user?.is_staff || user?.institution_role === 'manager')

  return (
    <Suspense fallback={<Spinner className="min-h-[60vh]" />}>
      {DEMO && <DemoBar />}
      <RouteSeo />
      <TopBoundary>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={user ? <Navigate to="/learn" replace /> : <Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/okullar" element={<Schools />} />
          <Route path="/yardim" element={<Help />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/newsletter/confirm/:token" element={<Newsletter action="confirm" />} />
          <Route path="/newsletter/unsubscribe/:token" element={<Newsletter action="unsubscribe" />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/cookies" element={<Legal kind="cookies" />} />
          <Route path="/distance-sales" element={<Legal kind="distance" />} />
          <Route path="/refund" element={<Legal kind="refund" />} />
        </Route>
        <Route path="/placement" element={<Placement />} />
        <Route path="/r/:code" element={<Register />} />
        <Route path="/davet/:token" element={<Invite />} />
        <Route path="/login" element={<Guard guest><Login /></Guard>} />
        <Route path="/register" element={<Guard guest><Register /></Guard>} />
        <Route path="/forgot-password" element={<Guard guest><ForgotPassword /></Guard>} />
        <Route path="/verify-email" element={<Guard verified={false}><VerifyEmail /></Guard>} />

        <Route path="/lesson/:id" element={<Guard><LessonPlayer /></Guard>} />
        <Route path="/kurum" element={<Guard><InstitutionLayout /></Guard>}>
          <Route index element={<InstOverview />} />
          <Route path="ogrenciler" element={<InstStudents />} />
          <Route path="siniflar" element={<InstClasses />} />
          <Route path="davetler" element={<InstInvites />} />
          <Route path="ayarlar" element={<InstSettings />} />
          <Route path="odevler" element={<SchoolHomework />} />
          <Route path="ogretmenler" element={<SchoolTeachers />} />
        </Route>
        <Route element={<Guard><AppLayout /></Guard>}>
          <Route path="/learn" element={<Learn />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/stories/:slug" element={<StoryReader />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/yolum" element={<TrackSetup />} />
          <Route path="/practice/sets/new" element={<SetEditor />} />
          <Route path="/practice/sets/:id" element={<SetDetail />} />
          <Route path="/practice/sets/:id/edit" element={<SetEditor />} />
          <Route path="/ai" element={<AiHub />} />
          <Route path="/ai/writing" element={<WritingLab />} />
          <Route path="/ai/:id" element={<AiChat />} />
          <Route path="/duel" element={<Duel />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/leagues" element={<Leagues />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/achievements" element={<Achievements />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/coupons" element={<Coupons />} />
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
          <Route path="integrations" element={<AdminIntegrations />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="subscribers" element={<AdminSubscribers />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="blog" element={<AdminBlogList />} />
          <Route path="blog/:id" element={<AdminBlogEdit />} />
          <Route path="r/:resource" element={<AdminResource />} />
          <Route path="institutions/:id" element={<InstitutionDetail />} />
        </Route>

      </Routes>
      </TopBoundary>
    </Suspense>
  )
}

/** Last line of defence for full-screen routes (lessons, chats): reset on every navigation. */
function TopBoundary({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  return <PageBoundary resetKey={loc.pathname}>{children}</PageBoundary>
}
