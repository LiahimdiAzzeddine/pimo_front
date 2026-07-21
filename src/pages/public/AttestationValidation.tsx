import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileText, ShieldCheck, Upload } from 'lucide-react'
import { useParams } from 'react-router-dom'
import api from '@/lib/api'

interface AttestationInfo {
  partenaire: {
    nom_entreprise: string
    email?: string
    attestation_validite?: string
    attestation_original_name?: string
    attestation_mime_type?: string
    has_attestation: boolean
  }
  recipient_email: string
  expires_at?: string
  validated_at?: string
}

export default function AttestationValidation() {
  const { token = '' } = useParams()
  const [info, setInfo] = useState<AttestationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [validity, setValidity] = useState('')

  useEffect(() => {
    api.get<AttestationInfo>(`/attestations/${token}`)
      .then(({ data }) => setInfo(data))
      .catch(() => setError('Ce lien est invalide, expire ou indisponible.'))
      .finally(() => setLoading(false))
  }, [token])

  const download = async () => {
    if (!info) return
    setBusy(true); setError('')
    try {
      const response = await api.get<Blob>(`/attestations/${token}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = info.partenaire.attestation_original_name ?? 'attestation-assurance'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Impossible de telecharger cette attestation.')
    } finally {
      setBusy(false)
    }
  }

  const upload = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      setError('Merci de selectionner une attestation a deposer.')
      return
    }

    const form = new FormData()
    form.append('attestation_assurance_file', file)
    if (validity) form.append('attestation_validite', validity)

    setBusy(true); setError(''); setSuccess('')
    try {
      const { data } = await api.post<AttestationInfo & { message: string }>(`/attestations/${token}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess(data.message)
      setFile(null)
      setInfo((current) => current ? { ...current, partenaire: data.partenaire, validated_at: data.validated_at } : current)
    } catch {
      setError('Impossible de deposer cette attestation avec ce lien.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-400">Chargement de l'attestation...</div>
  if (!info) return <div className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><AlertTriangle className="mx-auto h-10 w-10 text-red-500" /><h1 className="mt-4 text-xl font-bold">Lien indisponible</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></div>

  const validUntil = info.partenaire.attestation_validite ? new Intl.DateTimeFormat('fr-FR').format(new Date(info.partenaire.attestation_validite)) : 'Non renseignee'
  const previewUrl = `/api/attestations/${token}/preview`
  const mimeType = info.partenaire.attestation_mime_type ?? ''

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <div className="mx-auto max-w-2xl">
      <header className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-300">PIMOO - Depot securise</p>
        <h1 className="mt-2 text-2xl font-bold">{info.partenaire.nom_entreprise}</h1>
        <p className="mt-1 text-sm text-slate-300">Lien valable jusqu'au {info.expires_at}</p>
      </header>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"><ShieldCheck className="h-5 w-5 text-emerald-600" /></div>
          <div><h2 className="font-bold">Attestation d'assurance</h2><p className="text-xs text-slate-400">Validite indiquee : {validUntil}</p></div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><FileText className="h-5 w-5 text-slate-500" /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{info.partenaire.attestation_original_name ?? 'Aucun fichier depose'}</p><p className="text-xs text-slate-400">{info.validated_at ? `Validee par le MOE le ${info.validated_at}` : 'En attente de validation MOE'}</p></div>
            {info.partenaire.has_attestation && <button disabled={busy} onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-600"><Download className="h-4 w-4" />Telecharger</button>}
          </div>
        </div>

        <form onSubmit={upload} className="mt-5 space-y-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-blue-900">Attestation a deposer</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-blue-900">Date de validite</label>
            <input type="date" value={validity} onChange={(event) => setValidity(event.target.value)} className="mt-2 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700" />
          </div>
          <button disabled={busy || !file} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Upload className="h-4 w-4" />Deposer l'attestation</button>
        </form>

        {info.partenaire.has_attestation && <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {mimeType.startsWith('image/') ? <img src={previewUrl} alt="Attestation d'assurance" className="max-h-[70vh] w-full object-contain" /> : <iframe title="Apercu de l'attestation" src={previewUrl} className="h-[70vh] w-full bg-white" />}
        </div>}
      </section>

      {success && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5" />{success}</div>}
      {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"><AlertTriangle className="h-5 w-5" />{error}</div>}
    </div>
  </main>
}
