import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'
import type { User } from '@/types'

export default function Register() {
  const [values, setValues] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { startSession } = useAuth()
  const navigate = useNavigate()
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const { data } = await api.post<{ user: User; token: string }>('/auth/register', { ...values, device_name: navigator.userAgent.slice(0, 100) })
      startSession(data.user, data.token); navigate('/dashboard')
    } catch (reason) { setError(isAxiosError(reason) ? Object.values(reason.response?.data?.error?.details ?? {}).flat()[0] as string ?? 'Inscription impossible.' : 'Inscription impossible.') }
    finally { setLoading(false) }
  }
  return <AuthShell title="Creer un compte MOE" description="Configurez votre espace professionnel en quelques instants."><form onSubmit={submit} className="space-y-4">
    <label className="block"><span className="mb-1 block text-sm font-medium">Nom complet</span><input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    <label className="block"><span className="mb-1 block text-sm font-medium">Email professionnel</span><input type="email" required value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    <label className="block"><span className="mb-1 block text-sm font-medium">Mot de passe</span><input type="password" required minLength={8} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" /><span className="mt-1 block text-xs text-slate-400">8 caracteres minimum, avec lettres et chiffres.</span></label>
    <label className="block"><span className="mb-1 block text-sm font-medium">Confirmation</span><input type="password" required value={values.password_confirmation} onChange={(event) => setValues({ ...values, password_confirmation: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Creation...' : 'Creer mon espace'}</button>
    <p className="text-center text-sm text-slate-500">Deja inscrit ? <Link to="/login" className="font-semibold text-blue-600">Se connecter</Link></p>
  </form></AuthShell>
}
