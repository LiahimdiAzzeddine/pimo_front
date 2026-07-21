import { useState } from 'react'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import type { Document, Lot, Partenaire } from '@/types'

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function OffreForm({ projetId, lot, partners, onSaved, onClose }: { projetId: string; lot: Lot; partners: Partenaire[]; onSaved: () => void; onClose: () => void }) {
  const [partenaireId, setPartenaireId] = useState('')
  const [partenaireNom, setPartenaireNom] = useState('')
  const [statut, setStatut] = useState('recu')
  const [montantHt, setMontantHt] = useState('')
  const [tauxTva, setTauxTva] = useState('20')
  const [dateButoir, setDateButoir] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedPartner = partners.find((partner) => partner.id === Number(partenaireId))
  const entreprise = selectedPartner?.nom_entreprise ?? partenaireNom.trim()
  const ht = montantHt === '' ? null : Number(montantHt)
  const tva = tauxTva === '' ? 20 : Number(tauxTva)
  const ttc = ht === null || Number.isNaN(ht) ? null : Math.round(ht * (1 + tva / 100) * 100) / 100
  const attente = statut === 'en_attente'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!entreprise) { setError('Choisissez une entreprise de l annuaire ou saisissez son nom.'); return }
    setBusy(true); setError('')
    try {
      let documentId: number | null = null
      if (file && !attente) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projet_id', projetId)
        formData.append('nom', `Devis ${entreprise} - ${lot.nom}`)
        formData.append('type_document', 'devis')
        formData.append('phase', 'consultation_entreprises')
        if (partenaireId) formData.append('partenaire_id', partenaireId)
        const upload = await api.post<{ document: Document }>('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        documentId = upload.data.document.id
      }

      await api.post('/devis', {
        projet_id: Number(projetId),
        lot_id: lot.id,
        type: 'artisan',
        partenaire_id: partenaireId ? Number(partenaireId) : null,
        partenaire_nom: entreprise,
        lot: lot.nom,
        montant_ht: attente ? null : ht,
        montant_ttc: attente ? null : ttc,
        taux_tva: tva,
        statut,
        phase: 'consultation_entreprises',
        date_butoir: dateButoir || null,
        notes: notes.trim() || null,
        document_id: documentId,
      })

      if (lot.statut === 'a_faire') await api.patch(`/lots/${lot.id}`, { statut: 'en_cours' })
      onSaved()
      onClose()
    } catch (submitError) {
      setError(apiErrorMessage(submitError, 'Impossible d enregistrer cette offre. Verifiez les champs (fichier : PDF, JPEG ou PNG, 10 Mo max).'))
    } finally {
      setBusy(false)
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <label><span className="mb-1.5 block text-sm font-medium">Entreprise de l annuaire</span>
        <select value={partenaireId} onChange={(event) => { setPartenaireId(event.target.value); setPartenaireNom('') }} className={inputClass}>
          <option value="">Autre / saisie libre</option>
          {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.nom_entreprise}{partner.activite ? ` - ${partner.activite}` : ''}</option>)}
        </select>
      </label>
      <label><span className="mb-1.5 block text-sm font-medium">Nom de l entreprise {partenaireId ? '' : '*'}</span>
        <input required={!partenaireId} disabled={Boolean(partenaireId)} value={partenaireId ? selectedPartner?.nom_entreprise ?? '' : partenaireNom} onChange={(event) => setPartenaireNom(event.target.value)} placeholder="Entreprise hors annuaire" className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`} />
      </label>
      <label><span className="mb-1.5 block text-sm font-medium">Statut de l offre</span>
        <select value={statut} onChange={(event) => setStatut(event.target.value)} className={inputClass}>
          <option value="recu">Offre recue (montants connus)</option>
          <option value="en_attente">Offre attendue (pas encore de reponse)</option>
        </select>
      </label>
      <label><span className="mb-1.5 block text-sm font-medium">Date butoir</span><input type="date" value={dateButoir} onChange={(event) => setDateButoir(event.target.value)} className={inputClass} /></label>
    </div>

    {!attente && <div className="border-t border-slate-100 pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Montants</p><div className="grid gap-4 sm:grid-cols-3">
      <label><span className="mb-1.5 block text-sm font-medium">Montant HT *</span><input required type="number" min="0" step="0.01" value={montantHt} onChange={(event) => setMontantHt(event.target.value)} className={inputClass} /></label>
      <label><span className="mb-1.5 block text-sm font-medium">TVA (%)</span><input type="number" min="0" max="100" step="0.1" value={tauxTva} onChange={(event) => setTauxTva(event.target.value)} className={inputClass} /></label>
      <div><span className="mb-1.5 block text-sm font-medium">Montant TTC</span><div className={`${inputClass} bg-slate-50 text-slate-500`}>{ttc === null ? '-' : `${ttc.toLocaleString('fr-FR')} EUR`}</div></div>
    </div></div>}

    {!attente && <label className="block"><span className="mb-1.5 block text-sm font-medium">Devis PDF (optionnel)</span>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" />
      <span className="mt-1 block text-xs text-slate-400">PDF, JPEG ou PNG - 10 Mo maximum</span>
    </label>}

    <label className="block"><span className="mb-1.5 block text-sm font-medium">Notes</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Variantes, reserves, delais annonces..." className={inputClass} /></label>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button>
      <button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enregistrement...' : 'Enregistrer l offre'}</button>
    </div>
  </form>
}

export default function OffreFormModal({ open, projetId, lot, partners, onSaved, onClose }: { open: boolean; projetId: string; lot: Lot | null; partners: Partenaire[]; onSaved: () => void; onClose: () => void }) {
  return <Modal open={open && Boolean(lot)} title={lot ? `Nouvelle offre - ${lot.nom}` : 'Nouvelle offre'} onClose={onClose}>
    {open && lot && <OffreForm key={lot.id} projetId={projetId} lot={lot} partners={partners} onSaved={onSaved} onClose={onClose} />}
  </Modal>
}
