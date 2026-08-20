import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import Login from '@/pages/auth/Login'
import SuiviChantier from '@/pages/projets/SuiviChantier'
import ProjetDetail from '@/pages/projets/ProjetDetail'
import MoeLayout from '@/components/layout/MoeLayout'
import Dashboard from '@/pages/moe/Dashboard'
import Documents from '@/pages/moe/Documents'
import Clients from '@/pages/moe/Clients'
import Partenaires from '@/pages/moe/Partenaires'
import Consultation from '@/pages/moe/Consultation'
import Finances from '@/pages/moe/Finances'
import Relances from '@/pages/moe/Relances'
import Chantier from '@/pages/moe/Chantier'
import Cloture from '@/pages/moe/Cloture'
import Profile from '@/pages/moe/Profile'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import Home from '@/pages/public/Home'
import PublicPortal from '@/pages/public/PublicPortal'
import AttestationValidation from '@/pages/public/AttestationValidation'

const queryClient = new QueryClient()

function ProtectedRoute({ children, role, permission }: { children: React.ReactNode; role: string; permission: string }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.status !== 'active' || !user.roles?.some((item) => item.name === role) || !user.effective_permissions?.includes(permission)) return <Navigate to="/forbidden" replace />

  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/portail/:token" element={<PublicPortal />} />
      <Route path="/attestations/:token" element={<AttestationValidation />} />
      <Route element={<ProtectedRoute role="moe" permission="platform.moe.access"><MoeLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projets" element={<SuiviChantier />} />
        <Route path="/projets/:id" element={<ProjetDetail />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/partenaires" element={<Partenaires />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="/chantier" element={<Chantier />} />
        <Route path="/cloture" element={<Cloture />} />
        <Route path="/relances" element={<Relances />} />
        <Route path="/profil" element={<Profile />} />
      </Route>
      <Route path="/forbidden" element={<div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center"><div><h1 className="text-3xl font-bold">Acces refuse</h1><p className="mt-2 text-slate-500">Cet espace est reserve aux comptes MOE.</p><button onClick={() => { localStorage.clear(); window.location.href = '/login' }} className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-white">Retour a la connexion</button></div></div>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
