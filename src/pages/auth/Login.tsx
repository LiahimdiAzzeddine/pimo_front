import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const [email, setEmail]       = useState('marion@pimoo.fr')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('')
    try { await login(email, password); navigate('/dashboard') }
    catch (reason) { setError(isAxiosError(reason) ? reason.response?.data?.error?.details?.email?.[0] ?? 'Connexion impossible.' : 'Connexion impossible.') }
    finally { setLoading(false) }
  }

  return <AuthShell title="Connexion" description="Accedez a votre espace de pilotage MOE.">
    <form onSubmit={submit} className="space-y-5">
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Mot de passe</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
      <div className="text-right"><Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">Mot de passe oublie ?</Link></div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? 'Connexion...' : 'Se connecter'}</button>
      <p className="text-center text-sm text-slate-500">Nouveau sur PIMOO ? <Link to="/register" className="font-semibold text-blue-600">Creer un compte MOE</Link></p>
    </form>
  </AuthShell>
}
