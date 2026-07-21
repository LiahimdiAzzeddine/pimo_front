import { useState } from 'react'
import { Send } from 'lucide-react'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import type { Lot, Partenaire } from '@/types'

interface ConsulterResponse {
  message: string
  envoyees: string[]
  deja_consultees: string[]
  echecs: string[]
}

function ConsulterForm({ lot, partners, onSaved, onClose }: { lot: Lot; partners: Partenaire[]; onSaved: () => void; onClose: () => void }) {
  const [selected, setSelected] = useState<number[]>([])
  const [dateButoir, setDateButoir] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ConsulterResponse | null>(null)

  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (selected.length === 0) { setError('Selectionnez au moins une entreprise.'); return }
    setBusy(true); setError('')
    try {
      const response = await api.post<ConsulterResponse>(`/lots/${lot.id}/consulter`, { partenaire_ids: selected, date_butoir: dateButoir || null })
      setResult(response.data)
      onSaved()
    } catch (submitError) {
      setError(apiErrorMessage(submitError, 'Impossible d envoyer la consultation.'))
    } finally {
      setBusy(false)
    }
  }

  if (result) return <div className="space-y-4">
    <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
      <p className="font-semibold">{result.envoyees.length} consultation(s) envoyee(s) par email.</p>
      {result.envoyees.length > 0 && <p className="mt-1">{result.envoyees.join(', ')} : devis attendu, lien de depot securise transmis.</p>}
    </div>
    {result.deja_consultees.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Deja consultees (ignorees) : {result.deja_consultees.join(', ')}.</p>}
    {result.echecs.length > 0 && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Echec d envoi : {result.echecs.join(', ')}. Verifiez les adresses email puis reessayez.</p>}
    <div className="flex justify-end border-t border-slate-100 pt-4"><button onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Fermer</button></div>
  </div>

  return <form onSubmit={submit} className="space-y-5">
    <p className="text-sm text-slate-500">Chaque entreprise selectionnee recevra un email avec un lien securise pour deposer son devis sur le lot <strong>{lot.nom}</strong>, sans creer de compte.</p>
    <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
      {partners.length === 0 && <p className="p-4 text-center text-sm text-slate-400">Aucune entreprise dans votre annuaire.</p>}
      {partners.map((partner) => <label key={partner.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${partner.email ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50'}`}>
        <input type="checkbox" disabled={!partner.email} checked={selected.includes(partner.id)} onChange={() => toggle(partner.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">{partner.nom_entreprise}</span>
          <span className="block truncate text-xs text-slate-400">{partner.email ?? 'Email manquant - impossible a consulter'}{partner.activite ? ` - ${partner.activite}` : ''}</span>
        </span>
      </label>)}
    </div>
    <label className="block sm:max-w-48"><span className="mb-1.5 block text-sm font-medium">Date butoir de remise</span>
      <input type="date" required value={dateButoir} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDateButoir(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </label>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button>
      <button disabled={busy || selected.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{busy ? 'Envoi en cours...' : `Consulter ${selected.length || ''} entreprise(s)`}</button>
    </div>
  </form>
}

export default function ConsulterModal({ open, lot, partners, onSaved, onClose }: { open: boolean; lot: Lot | null; partners: Partenaire[]; onSaved: () => void; onClose: () => void }) {
  return <Modal open={open && Boolean(lot)} title={lot ? `Consulter les entreprises - ${lot.nom}` : 'Consulter les entreprises'} onClose={onClose}>
    {open && lot && <ConsulterForm key={lot.id} lot={lot} partners={partners} onSaved={onSaved} onClose={onClose} />}
  </Modal>
}
