import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bell, BriefcaseBusiness, Building2, ChevronDown, ChevronLeft, ChevronRight, FileText, HardHat, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, UserRound, Users, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import GlobalSearch from '@/components/layout/GlobalSearch'
import NotificationPanel from '@/components/layout/NotificationPanel'
import type { AlertData } from '@/components/layout/NotificationPanel'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'

const navigation = [
  { group: 'Pilotage', items: [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/projets', label: 'Projets', icon: BriefcaseBusiness },
  ] },
  { group: 'Relations', items: [
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/partenaires', label: 'Partenaires', icon: Building2 },
  ] },
  { group: 'Operations', items: [
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/chantier', label: 'Suivi chantier', icon: HardHat },
  ] },
]

const pageTitles: Record<string, string> = {
  dashboard: 'Tableau de bord', projets: 'Projets', documents: 'Documents', clients: 'Clients', partenaires: 'Partenaires',
  consultation: 'Consultation', finances: 'Finances', chantier: 'Suivi chantier', cloture: 'Cloture & archives', relances: 'Relances', profil: 'Profil & securite',
}

export default function MoeLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [panel, setPanel] = useState<'notifications' | 'create' | 'user' | null>(null)
  const { user, logout } = useAuth()
  const location = useLocation()
  const segment = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  const focusMode = segment === 'chantier'
  const pageTitle = pageTitles[segment] ?? 'Espace MOE'
  const alerts = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get<AlertData>('/dashboard')).data, staleTime: 30_000, refetchInterval: 120_000 })
  const alertCount = (alerts.data?.alerts.reminders.length ?? 0) + (alerts.data?.alerts.documents.length ?? 0)

  const toggleCollapsed = () => setCollapsed((value) => { localStorage.setItem('sidebar-collapsed', String(!value)); return !value })
  const closePanels = () => setPanel(null)

  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm text-white focus:translate-y-0">Aller au contenu</a>
    {!focusMode && mobileOpen && <button aria-label="Fermer le menu" className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

    {!focusMode && <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 ${collapsed ? 'lg:w-20' : 'lg:w-64'} ${mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:translate-x-0'}`}>
      <div className={`flex h-18 items-center border-b border-slate-100 ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden" onClick={() => setMobileOpen(false)}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-200">P</div>{!collapsed && <div><p className="font-bold tracking-tight">PIMOO</p><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Espace MOE</p></div>}</Link>
        <button aria-label="Fermer" className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-4">
        {navigation.map((section, sectionIndex) => <div key={section.group} className={sectionIndex ? 'mt-5' : ''}>
          {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{section.group}</p>}
          <div className="space-y-1">{section.items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => `group flex items-center rounded-xl py-2.5 text-sm font-medium transition ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><Icon className="h-5 w-5 shrink-0" />{!collapsed && <span>{label}</span>}</NavLink>)}</div>
        </div>)}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <NavLink to="/profil" title={collapsed ? 'Profil & securite' : undefined} className={({ isActive }) => `mb-2 flex items-center rounded-xl p-2.5 transition ${collapsed ? 'justify-center' : 'gap-3'} ${isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{user?.name?.slice(0, 2).toUpperCase()}</div>{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div>}
        </NavLink>
        <button onClick={logout} title={collapsed ? 'Deconnexion' : undefined} className={`flex w-full items-center rounded-xl py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}><LogOut className="h-4 w-4" />{!collapsed && 'Deconnexion'}</button>
      </div>
      <button aria-label={collapsed ? 'Deployer la navigation' : 'Reduire la navigation'} onClick={toggleCollapsed} className="absolute -right-3 top-24 hidden h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-blue-600 lg:grid">{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
    </aside>}

    <div className={`min-h-screen transition-[padding] duration-200 ${focusMode ? '' : collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
      <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl lg:px-8">
        {focusMode
          ? <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Tableau de bord</span></Link>
          : <button aria-label="Ouvrir le menu" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>}
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{pageTitle}</p><p className="hidden text-xs text-slate-400 sm:block">Espace MOE / {pageTitle}</p></div>
        <button onClick={() => setSearchOpen(true)} className="ml-auto hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:border-slate-300 hover:bg-white md:flex"><Search className="h-4 w-4" /><span className="flex-1 text-left">Recherche globale</span><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">Ctrl K</kbd></button>
        <button aria-label="Rechercher" onClick={() => setSearchOpen(true)} className="ml-auto rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 md:hidden"><Search className="h-5 w-5" /></button>

        <div className="relative hidden md:block">
          <button onClick={() => setPanel(panel === 'create' ? null : 'create')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Creer</button>
          {panel === 'create' && <div className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"><p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Creation rapide</p>{[
            { to: '/projets?create=1', label: 'Nouveau projet', icon: BriefcaseBusiness }, { to: '/clients?create=1', label: 'Nouveau client', icon: UserRound }, { to: '/partenaires?create=1', label: 'Nouveau partenaire', icon: Building2 }, { to: '/documents?create=1', label: 'Nouveau document', icon: FileText },
          ].map(({ to, label, icon: Icon }) => <Link key={label} to={to} onClick={closePanels} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700"><Icon className="h-4 w-4" />{label}</Link>)}</div>}
        </div>

        <div className="relative">
          <button aria-label="Ouvrir les alertes" onClick={() => setPanel(panel === 'notifications' ? null : 'notifications')} className={`relative rounded-xl p-2.5 ${panel === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}><Bell className="h-5 w-5" />{alertCount > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />}</button>
          {panel === 'notifications' && <NotificationPanel data={alerts.data} loading={alerts.isLoading} onClose={closePanels} />}
        </div>
        <div className="relative hidden sm:block">
          <button onClick={() => setPanel(panel === 'user' ? null : 'user')} className={`flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-slate-100 ${panel === 'user' ? 'bg-slate-100' : ''}`}><div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{user?.name?.slice(0, 2).toUpperCase()}</div><ChevronDown className="h-4 w-4 text-slate-400" /></button>
          {panel === 'user' && <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"><div className="border-b border-slate-100 p-4"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div><div className="p-2"><Link to="/profil" onClick={closePanels} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><UserRound className="h-4 w-4" />Mon profil</Link><Link to="/profil" onClick={closePanels} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><Settings className="h-4 w-4" />Securite</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Se deconnecter</button></div></div>}
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[1600px] p-4 pb-24 lg:p-8"><Outlet /></main>
      {!focusMode && <nav aria-label="Navigation mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        {[{ to: '/dashboard', label: 'Accueil', icon: LayoutDashboard }, { to: '/projets', label: 'Projets', icon: BriefcaseBusiness }, { to: '/documents', label: 'Documents', icon: FileText }].map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}><Icon className="h-5 w-5" />{label}</NavLink>)}
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium text-slate-400"><Menu className="h-5 w-5" />Menu</button>
      </nav>}
    </div>

    {panel && <button aria-label="Fermer le panneau" className="fixed inset-0 z-20" onClick={closePanels} />}
    <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
  </div>
}
