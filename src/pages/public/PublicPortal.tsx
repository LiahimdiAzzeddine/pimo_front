import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileText, Upload } from 'lucide-react'
import { useParams } from 'react-router-dom'
import api from '@/lib/api'

interface PortalInfo {
  type: string
  permissions: Record<string, boolean>
  projet: { id: number; nom: string; adresse?: string; phase: string }
  destinataire?: string
  expire_le?: string
}

interface PortalDocument {
  id: number
  nom: string
  type_document: string
  statut: string
  has_file: boolean
}

export default function PublicPortal() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<PortalInfo | null>(null)
  const [documents, setDocuments] = useState<PortalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('autre')
  const [montantHt, setMontantHt] = useState('')
  const [tauxTva, setTauxTva] = useState('20')
  const [file, setFile] = useState<File | null>(null)
  const [signatory, setSignatory] = useState('')

  const ht = montantHt === '' ? null : Number(montantHt)
  const tva = tauxTva === '' ? 20 : Number(tauxTva)
  const ttc = ht === null || Number.isNaN(ht) ? null : Math.round(ht * (1 + tva / 100) * 100) / 100

  useEffect(() => {
    api.get<PortalInfo>(`/liens/${token}`).then(async ({ data }) => {
      setInfo(data)
      if (data.permissions.download || data.permissions.validate || data.permissions.sign) {
        const response = await api.get<{ documents: PortalDocument[] }>(`/liens/${token}/documents`)
        setDocuments(response.data.documents)
      }
    }).catch(() => setError('Ce lien est invalide, expire ou a deja ete utilise.')).finally(() => setLoading(false))
  }, [token])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return
    setBusy(true); setError(''); setSuccess('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('nom', name || file.name)
    formData.append('type_document', type)
    if (type === 'devis' && ht !== null && !Number.isNaN(ht)) {
      formData.append('montant_ht', String(ht))
      formData.append('montant_ttc', String(ttc ?? ht))
      formData.append('taux_tva', String(tva))
    }
    try {
      await api.post(`/liens/${token}/depot`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSuccess('Le document a ete depose avec succes.')
      setFile(null); setName(''); setType('autre'); setMontantHt(''); setTauxTva('20')
    } catch {
      setError('Le depot a echoue. Utilisez un PDF, JPEG ou PNG de 10 Mo maximum.')
    } finally {
      setBusy(false)
    }
  }

  const download = async (document: PortalDocument) => {
    setBusy(true); setError('')
    try {
      const response = await api.get<Blob>(`/liens/${token}/documents/${document.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = window.document.createElement('a')
      anchor.href = url; anchor.download = document.nom; anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Ce fichier ne peut pas etre telecharge avec ce lien.')
    } finally {
      setBusy(false)
    }
  }

  const validate = async (document: PortalDocument, action: 'valider' | 'refuser') => {
    setBusy(true); setError('')
    const notes = action === 'refuser' ? window.prompt('Motif du refus (facultatif)') : undefined
    try {
      await api.post(`/liens/${token}/documents/${document.id}/valider`, { action, notes })
      setDocuments((items) => items.map((item) => item.id === document.id ? { ...item, statut: action === 'valider' ? 'valide' : 'refuse' } : item))
      setSuccess(action === 'valider' ? 'Le document a ete valide.' : 'Le refus a ete enregistre.')
    } catch {
      setError('Cette action ne peut pas etre enregistree avec ce lien.')
    } finally {
      setBusy(false)
    }
  }

  const sign = async (document: PortalDocument) => {
    if (!signatory.trim()) return
    setBusy(true); setError('')
    try {
      await api.post(`/liens/${token}/documents/${document.id}/signer`, { signataire: signatory.trim() })
      setDocuments((items) => items.map((item) => item.id === document.id ? { ...item, statut: 'signe' } : item))
      setSuccess('La signature a ete enregistree.'); setSignatory('')
    } catch {
      setError('Cette signature ne peut pas etre enregistree avec ce lien.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-400">Chargement du portail...</div>
  if (!info) return <div className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><AlertTriangle className="mx-auto h-10 w-10 text-red-500" /><h1 className="mt-4 text-xl font-bold">Lien indisponible</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></div>

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <div className="mx-auto max-w-2xl">
      <header className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg"><p className="text-xs uppercase tracking-[0.2em] text-blue-300">PIMOO - Portail securise</p><h1 className="mt-2 text-2xl font-bold">{info.projet.nom}</h1><p className="mt-1 text-sm text-slate-300">{info.projet.adresse ?? info.projet.phase.replaceAll('_', ' ')}</p><p className="mt-4 text-xs text-slate-400">Lien valable jusqu'au {info.expire_le}</p></header>

      {info.permissions.upload ? <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50"><Upload className="h-5 w-5 text-blue-600" /></div><div><h2 className="font-bold">Deposer un document</h2><p className="text-xs text-slate-400">PDF, JPEG ou PNG - 10 Mo maximum</p></div></div>
        <form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium">Fichier *</span><input required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-slate-200 p-2 text-sm" /></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Nom du document</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={file?.name ?? 'Nom affiche'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label><span className="mb-1.5 block text-sm font-medium">Type</span><select value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="autre">Autre</option><option value="devis">Devis</option><option value="plan">Plan</option><option value="assurance">Assurance</option><option value="facture">Facture</option><option value="photo">Photo</option><option value="compte_rendu">Compte rendu</option></select></label></div>{type === 'devis' && <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3"><label><span className="mb-1.5 block text-sm font-medium">Montant HT *</span><input required type="number" min="0" step="0.01" value={montantHt} onChange={(event) => setMontantHt(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label><span className="mb-1.5 block text-sm font-medium">TVA (%)</span><input type="number" min="0" max="100" step="0.1" value={tauxTva} onChange={(event) => setTauxTva(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><div><span className="mb-1.5 block text-sm font-medium">Montant TTC</span><div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500">{ttc === null ? '-' : `${ttc.toLocaleString('fr-FR')} EUR`}</div></div></div>}<button disabled={!file || busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Depot en cours...' : 'Deposer le document'}</button></form>
      </section> : <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-bold">Documents disponibles</h2><p className="text-xs text-slate-400">Les documents autorises pour votre acces</p>{info.permissions.sign && <input value={signatory} onChange={(event) => setSignatory(event.target.value)} placeholder="Nom complet du signataire" className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />}</div><div className="divide-y divide-slate-100">{documents.map((document) => <div key={document.id} className="flex flex-wrap items-center gap-3 p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><FileText className="h-5 w-5 text-slate-500" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.nom}</p><p className="text-xs text-slate-400">{document.type_document.replaceAll('_', ' ')} - {document.statut}</p></div><div className="flex flex-wrap gap-2">{document.has_file && info.permissions.download && <button disabled={busy} onClick={() => download(document)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600"><Download className="h-4 w-4" />Telecharger</button>}{info.permissions.validate && <><button disabled={busy} onClick={() => validate(document, 'refuser')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">Refuser</button><button disabled={busy} onClick={() => validate(document, 'valider')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Valider</button></>}{info.permissions.sign && <button disabled={busy || !signatory.trim()} onClick={() => sign(document)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Signer</button>}</div></div>)}{documents.length === 0 && <p className="p-10 text-center text-sm text-slate-400">Aucun document disponible.</p>}</div></section>}
      {success && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5" />{success}</div>}
      {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="h-5 w-5" />{error}</div>}
    </div>
  </main>
}
