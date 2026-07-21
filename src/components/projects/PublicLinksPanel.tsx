import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Check, Clipboard, Link2, Send, ShieldX } from 'lucide-react'
import api from '@/lib/api'
import type { Document, PaginatedResponse, Partenaire, Projet } from '@/types'

interface PublicLink {
  id: number
  type: string
  recipient_email: string
  expires_at?: string
  status: 'actif' | 'utilise' | 'expire' | 'revoque'
  url: string
  document?: { id: number; nom: string }
}

interface InvitationResponse {
  message: string
  url_depot: string
}

const typeLabels: Record<string, string> = {
  upload_document: 'Depot de documents', view_document: 'Consultation',
  validate_document: 'Validation', sign_document: 'Signature',
}

function apiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Impossible de creer le lien securise.'

  const data = error.response?.data as { error?: { message?: string }; message?: string; errors?: Record<string, string[]> } | undefined
  return data?.error?.message ?? data?.message ?? Object.values(data?.errors ?? {})[0]?.[0]
    ?? 'Impossible de creer le lien. Verifiez le destinataire, son email et le document cible.'
}

export default function PublicLinksPanel({ project, documents, onProjectChanged }: { project: Projet; documents: Document[]; onProjectChanged?: () => void | Promise<void> }) {
  const queryClient = useQueryClient()
  const [audience, setAudience] = useState<'client' | 'partenaire'>(project.client ? 'client' : 'partenaire')
  const [recipientId, setRecipientId] = useState('')
  const [type, setType] = useState('view_document')
  const [documentId, setDocumentId] = useState('')
  const [expiration, setExpiration] = useState('7')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<number | 'success' | null>(null)
  const [success, setSuccess] = useState<{ message: string; url: string } | null>(null)

  const links = useQuery({
    queryKey: ['public-links', project.id],
    queryFn: async () => (await api.get<{ data: PublicLink[] }>(`/projets/${project.id}/liens`)).data.data,
  })
  const partners = useQuery({
    queryKey: ['invitation-partners'],
    queryFn: async () => (await api.get<PaginatedResponse<Partenaire>>('/partenaires?limit=200')).data.data,
    enabled: audience === 'partenaire',
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['public-links', project.id] })
  const create = useMutation({
    mutationFn: async () => {
      const scoped = ['validate_document', 'sign_document'].includes(type)
      const payload: Record<string, string | number> = { type, expiration: Number(expiration) }
      if ((scoped || type === 'view_document') && documentId) payload.document_id = Number(documentId)
      if (audience === 'client') {
        if (!project.client) throw new Error('missing-client')
        payload.client_id = project.client.id
        return api.post(`/projets/${project.id}/inviter-client`, payload, { timeout: 15000 })
      }
      payload.partenaire_id = Number(recipientId)
      return api.post(`/projets/${project.id}/inviter-partenaire`, payload, { timeout: 15000 })
    },
    onSuccess: async (response) => {
      const data = response.data as InvitationResponse
      await refresh()
      await queryClient.invalidateQueries({ queryKey: ['invitation-partners'] })
      await onProjectChanged?.()
      setError('')
      setDocumentId('')
      setSuccess({ message: data.message, url: data.url_depot })
    },
    onError: (mutationError) => { setSuccess(null); setError(apiErrorMessage(mutationError)) },
  })
  const revoke = useMutation({
    mutationFn: (id: number) => api.delete(`/liens/${id}`),
    onSuccess: refresh,
    onError: () => setError('Impossible de revoquer ce lien.'),
  })
  const needsDocument = ['validate_document', 'sign_document'].includes(type)
  const selectedPartner = partners.data?.find((partner) => partner.id === Number(recipientId))
  const canSubmit = audience === 'client' ? Boolean(project.client?.email) : Boolean(selectedPartner?.email)
  const inputClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500'

  const copyLink = async (url: string, source: number | 'success') => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const input = globalThis.document.createElement('textarea')
      input.value = url
      input.style.position = 'fixed'
      input.style.opacity = '0'
      globalThis.document.body.appendChild(input)
      input.select()
      globalThis.document.execCommand('copy')
      input.remove()
    }
    setCopied(source)
    window.setTimeout(() => setCopied(null), 1800)
  }

  return <section className="rounded-xl border border-gray-200 bg-white p-5">
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50"><Link2 className="h-5 w-5 text-blue-600" /></div><div><h2 className="font-bold text-gray-900">Liens publics securises</h2><p className="text-xs text-gray-400">Invitations limitees par destinataire, document et expiration</p></div></div>
    <form onSubmit={(event) => { event.preventDefault(); create.mutate() }} className="mt-5 grid gap-3 lg:grid-cols-5">
      <select value={audience} onChange={(event) => { setAudience(event.target.value as 'client' | 'partenaire'); setRecipientId(''); setSuccess(null); if (event.target.value === 'client' && type === 'upload_document') setType('view_document') }} className={inputClass}><option value="client" disabled={!project.client}>Client</option><option value="partenaire">Entreprise</option></select>
      {audience === 'partenaire' ? <select required value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className={inputClass}><option value="">{partners.isLoading ? 'Chargement des entreprises...' : 'Choisir une entreprise'}</option>{partners.data?.map((partner) => <option key={partner.id} value={partner.id} disabled={!partner.email}>{partner.nom_entreprise}{partner.email ? ` - ${partner.email}` : ' - email manquant'}</option>)}</select> : <div className={`${inputClass} bg-slate-50 text-slate-500`}>{project.client ? `${project.client.prenom ?? ''} ${project.client.nom}${project.client.email ? ` - ${project.client.email}` : ' - email manquant'}` : 'Aucun client'}</div>}
      <select value={type} onChange={(event) => { setType(event.target.value); setDocumentId('') }} className={inputClass}>{audience === 'partenaire' && <option value="upload_document">Depot de documents</option>}<option value="view_document">Consultation</option><option value="validate_document">Validation</option><option value="sign_document">Signature</option></select>
      {type !== 'upload_document' ? <select required={needsDocument} value={documentId} onChange={(event) => setDocumentId(event.target.value)} className={inputClass}><option value="">{needsDocument ? 'Document cible' : 'Projet entier'}</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.nom}</option>)}</select> : <div className={`${inputClass} bg-slate-50 text-slate-400`}>Projet entier</div>}
      <div className="flex gap-2"><select aria-label="Duree de validite" value={expiration} onChange={(event) => setExpiration(event.target.value)} className={`${inputClass} min-w-0 flex-1`}><option value="1">1 j</option><option value="3">3 j</option><option value="7">7 j</option><option value="14">14 j</option><option value="30">30 j</option></select><button type="submit" title="Envoyer l'invitation" disabled={!canSubmit || (needsDocument && !documentId) || create.isPending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" /><span className="hidden xl:inline">{create.isPending ? 'Envoi...' : 'Inviter'}</span></button></div>
    </form>
    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    {success && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{success.message}. Le lien est actif et l'email est en cours d'envoi par SMTP.</span><button type="button" onClick={() => copyLink(success.url, 'success')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold hover:bg-emerald-100">{copied === 'success' ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}{copied === 'success' ? 'Lien copie' : 'Copier le lien'}</button></div>}
    <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">{links.isLoading ? <p className="py-6 text-center text-sm text-slate-400">Chargement...</p> : links.data?.map((link) => <div key={link.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-700">{typeLabels[link.type] ?? link.type} - {link.recipient_email}</p><p className="text-xs text-slate-400">{link.document?.nom ?? 'Projet entier'} - expiration {link.expires_at ? new Date(link.expires_at).toLocaleDateString('fr-FR') : 'non definie'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${link.status === 'actif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{link.status}</span>{link.status === 'actif' && <><button type="button" title={copied === link.id ? 'Lien copie' : 'Copier le lien'} onClick={() => copyLink(link.url, link.id)} className={`rounded-lg p-2 ${copied === link.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}>{copied === link.id ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button><button type="button" title="Revoquer" onClick={() => revoke.mutate(link.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><ShieldX className="h-4 w-4" /></button>{copied === link.id && <span className="text-xs font-medium text-emerald-600">Lien copie</span>}</>}</div>)}{!links.isLoading && !links.data?.length && <p className="py-6 text-center text-sm text-slate-400">Aucun lien cree pour ce projet.</p>}</div>
  </section>
}
