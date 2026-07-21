import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import api from '@/lib/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const { data } = await api.post<{ message: string }>('/auth/reset-password', { token: params.get('token'), email: params.get('email'), password, password_confirmation: confirmation })
      setMessage(data.message)
    } catch (reason) { setError(isAxiosError(reason) ? 'Le lien est invalide ou expire.' : 'Reinitialisation impossible.') }
    finally { setLoading(false) }
  }
  return <AuthShell title="Nouveau mot de passe" description="Choisissez un nouveau mot de passe pour votre compte."><form onSubmit={submit} className="space-y-5">
    <label className="block"><span className="mb-1 block text-sm font-medium">Nouveau mot de passe</span><input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    <label className="block"><span className="mb-1 block text-sm font-medium">Confirmation</span><input type="password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message} <Link to="/login" className="font-semibold underline">Se connecter</Link></p>}
    <button disabled={loading || Boolean(message)} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Mise a jour...' : 'Modifier le mot de passe'}</button>
  </form></AuthShell>
}
