import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import Projets from '@/pages/projets/Projets'
import ProjetDetail from '@/pages/projets/ProjetDetail'
import MoeLayout from '@/components/layout/MoeLayout'
import Documents from '@/pages/moe/Documents'
import Clients from '@/pages/moe/Clients'
import Partenaires from '@/pages/moe/Partenaires'
import Consultation from '@/pages/moe/Consultation'
import Finances from '@/pages/moe/Finances'
import Relances from '@/pages/moe/Relances'
import Chantier from '@/pages/moe/Chantier'
import Cloture from '@/pages/moe/Cloture'
import Profile from '@/pages/moe/Profile'
import SettingsPage from '@/pages/moe/Settings'
import LocalSetup from '@/pages/auth/LocalSetup'

const queryClient = new QueryClient()

function ProtectedRoute({ children, role, permission }: { children: React.ReactNode; role: string; permission: string }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>
  if (!user || !user.onboarding_completed) return <Navigate to="/setup" replace />
  if (user.status !== 'active' || !user.roles?.some((item) => item.name === role) || !user.effective_permissions?.includes(permission)) return <Navigate to="/forbidden" replace />

  return <>{children}</>
}

function AppRoutes() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-medium text-white">Ouverture de Pimoo...</div>

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user?.onboarding_completed ? '/dashboard' : '/setup'} replace />} />
      <Route path="/setup" element={user?.onboarding_completed ? <Navigate to="/dashboard" replace /> : <LocalSetup />} />
      <Route element={<ProtectedRoute role="moe" permission="platform.moe.access"><MoeLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Chantier />} />
        <Route path="/projets" element={<Projets />} />
        <Route path="/projets/:id" element={<ProjetDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/partenaires" element={<Partenaires />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="/chantier" element={<Navigate to="/dashboard" replace />} />
        <Route path="/cloture" element={<Cloture />} />
        <Route path="/relances" element={<Relances />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/parametres" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
