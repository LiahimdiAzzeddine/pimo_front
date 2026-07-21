import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import api from '@/lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true)
    try { const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email }); setMessage(data.message) }
    finally { setLoading(false) }
  }
  return <AuthShell title="Mot de passe oublie" description="Nous vous enverrons un lien de reinitialisation securise."><form onSubmit={submit} className="space-y-5">
    <label className="block"><span className="mb-1.5 block text-sm font-medium">Email du compte</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></label>
    {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Envoi...' : 'Envoyer le lien'}</button>
    <p className="text-center"><Link to="/login" className="text-sm font-semibold text-blue-600">Retour a la connexion</Link></p>
  </form></AuthShell>
}
