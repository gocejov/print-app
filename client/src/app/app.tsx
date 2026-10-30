import { lazy, Suspense, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  FolderOpen,
  Package,
  Layers3,
  Shuffle,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Settings2,
  Sparkles,
  Gamepad2,
  X,
} from 'lucide-react'
import { Brand } from '../components/brand'
import { AuthPage } from '../features/auth/auth-page'
import { useAuth } from '../features/auth/use-auth'
import { CodeLibrary } from '../features/codes/code-library'
const CategoriesPage = lazy(() =>
  import('../features/collections/collections-page').then((module) => ({
    default: module.CategoriesPage,
  })),
)
const CampaignsPage = lazy(() =>
  import('../features/collections/collections-page').then((module) => ({
    default: module.CampaignsPage,
  })),
)
const FilesPage = lazy(() =>
  import('../features/assets/files-page').then((module) => ({ default: module.FilesPage })),
)
const ProductsPage = lazy(() =>
  import('../features/assets/products-page').then((module) => ({ default: module.ProductsPage })),
)
const AnalyticsPage = lazy(() =>
  import('../features/analytics/analytics-page').then((module) => ({
    default: module.AnalyticsPage,
  })),
)
const GamesPage = lazy(() => import('../features/games/games-page').then(module => ({ default: module.GamesPage })))
const SettingsPage = lazy(() =>
  import('../features/settings/settings-page').then((module) => ({ default: module.SettingsPage })),
)
import { useToast } from './providers'

const links = [
  { to: '/', name: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/files', name: 'Files', icon: FolderOpen },
  { to: '/products', name: 'Products', icon: Package },
  { to: '/categories', name: 'Categories', icon: Layers3 },
  { to: '/campaigns', name: 'Campaigns', icon: Shuffle },
  { to: '/games', name: 'Games', icon: Gamepad2 },
  { to: '/qr-codes', name: 'My QR codes', icon: QrCode },
  { to: '/analytics', name: 'Analytics', icon: BarChart3 },
  { to: '/settings', name: 'Settings', icon: Settings2 },
]

export function App() {
  const auth = useAuth()
  const location = useLocation()
  const [mobile, setMobile] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const toast = useToast()
  if (auth.loading)
    return (
      <main className='app-loading'>
        <Brand />
        <div className='loading-line' />
        <p>Opening your workspace…</p>
      </main>
    )
  if (auth.error)
    return (
      <main className='fatal-error'>
        <Brand />
        <h1>Your workspace couldn’t connect.</h1>
        <p>{auth.error.message}</p>
        <button className='btn btn-primary' onClick={() => auth.retry()}>
          Try again
        </button>
      </main>
    )
  if (!auth.user) return <AuthPage />
  const user = auth.user
  const activeName = links.find((link) => link.to === location.pathname)?.name || 'Workspace'
  return (
    <div className='app-shell'>
      <a href='#main-content' className='skip-link'>
        Skip to content
      </a>
      {mobile && <div className='sidebar-scrim' onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`} aria-label='Main navigation'>
        <div className='sidebar-brand'>
          <Brand />
          <button
            className='icon-btn mobile-close'
            aria-label='Close navigation'
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className='workspace-label'>
          <span className='workspace-avatar'>{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>My workspace</strong>
            <span>A space for your connections</span>
          </div>
        </div>
        <span className='nav-section-label'>WORKSPACE</span>
        <nav>
          {links.map(({ to, name, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobile(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{name}</span>
              {to === '/qr-codes' && <span className='nav-dot' />}
            </NavLink>
          ))}
        </nav>
        <div className='sidebar-bottom'>
          <div className='sidebar-tip'>
            <span className='tip-icon'>
              <Sparkles size={19} />
            </span>
            <strong>One code. Endless possibilities.</strong>
            <p>Update your destination whenever your plans change.</p>
            <NavLink to='/qr-codes' onClick={() => setMobile(false)}>
              Make a connection
              <ArrowUpRight size={15} />
            </NavLink>
          </div>
          <a className='sidebar-help' href='/api-docs/' target='_blank' rel='noreferrer'>
            <CircleHelp size={18} />
            API documentation
            <ArrowUpRight size={14} />
          </a>
          <div className='sidebar-account'>
            <span className='account-avatar'>
              {user.name.slice(0, 1)}
              {user.lastName.slice(0, 1)}
            </span>
            <div>
              <strong>
                {user.name} {user.lastName}
              </strong>
              <span>{user.email}</span>
            </div>
            <button
              className='icon-btn'
              aria-label='Sign out'
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true)
                try {
                  await auth.logout()
                } catch (e) {
                  toast((e as Error).message, true)
                } finally {
                  setSigningOut(false)
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className='main-column'>
        <header className='topbar'>
          <div className='breadcrumbs'>
            <button
              className='icon-btn mobile-menu'
              aria-label='Open navigation'
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{activeName}</strong>
          </div>
          <div className='topbar-right'>
            <span className='workspace-status'>
              <span className='live-dot' />
              Your private workspace
            </span>
            <a href='/crud/' className='dev-tools' title='Legacy developer tools'>
              <BookOpen size={17} />
              <span>Developer tools</span>
              <ArrowUpRight size={13} />
            </a>
          </div>
        </header>
        <main id='main-content' className='main-content' key={user._id}>
          <Suspense
            fallback={
              <div className='table-skeleton' aria-label='Loading page'>
                <div />
                <div />
              </div>
            }
          >
            <Routes>
              <Route path='/' element={<CodeLibrary overview />} />
              <Route path='/files' element={<FilesPage />} />
              <Route path='/products' element={<ProductsPage />} />
              <Route path='/categories' element={<CategoriesPage />} />
              <Route path='/campaigns' element={<CampaignsPage />} />
              <Route path='/games' element={<GamesPage />} />
              <Route path='/qr-codes' element={<CodeLibrary />} />
              <Route path='/analytics' element={<AnalyticsPage />} />
              <Route path='/settings' element={<SettingsPage />} />
              <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
