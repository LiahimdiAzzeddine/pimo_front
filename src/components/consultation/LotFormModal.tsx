import { useState } from 'react'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import type { Lot } from '@/types'

function LotForm({ projetId, lot, onSaved, onClose }: { projetId: string; lot?: Lot | null; onSaved: () => void; onClose: () => void }) {
  const [nom, setNom] = useState(lot?.nom ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      if (lot) await api.patch(`/lots/${lot.id}`, { nom })
      else await api.post(`/projets/${projetId}/lots`, { nom })
      onSaved()
      onClose()
    } catch (submitError) {
      setError(apiErrorMessage(submitError, 'Impossible d enregistrer ce lot.'))
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <label className="block"><span className="mb-1.5 block text-sm font-medium">Nom du lot *</span>
      <input required autoFocus value={nom} onChange={(event) => setNom(event.target.value)} placeholder="Ex : Gros oeuvre, Plomberie, Electricite..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </label>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button>
      <button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enregistrement...' : lot ? 'Renommer le lot' : 'Creer le lot'}</button>
    </div>
  </form>
}

export default function LotFormModal({ open, projetId, lot, onSaved, onClose }: { open: boolean; projetId: string; lot?: Lot | null; onSaved: () => void; onClose: () => void }) {
  return <Modal open={open} title={lot ? 'Renommer le lot' : 'Nouveau lot de travaux'} onClose={onClose}>
    {open && <LotForm key={lot?.id ?? 'new'} projetId={projetId} lot={lot} onSaved={onSaved} onClose={onClose} />}
  </Modal>
}
