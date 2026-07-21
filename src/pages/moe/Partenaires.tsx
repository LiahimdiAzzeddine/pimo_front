import { useDeferredValue, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Download, FileWarning, Mail, Pencil, Phone, Plus, RotateCw, Search, Send, ShieldCheck, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import type { PaginatedResponse, Partenaire } from '@/types'

type PartnerPayload = Omit<Partenaire, 'id' | 'projets_count' | 'devis_count'>
type PartnerFormValues = PartnerPayload

const emptyPartner: PartnerPayload = {
  nom_entreprise: '', type_partenaire: 'artisan', activite: '', email: '', telephone: '', siret: '',
  adresse: '', attestation_validite: '', attestation_assurance_url: '', notes: '',
}
const typeLabels: Record<string, string> = { artisan: 'Artisan', photographe: 'Photographe', fournisseur: 'Fournisseur', autre: 'Autre' }

async function downloadAttestation(partner: Partenaire) {
  const response = await api.get<Blob>(`/partenaires/${partner.id}/attestation`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = partner.attestation_assurance_original_name ?? 'attestation-assurance'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function insuranceState(date?: string) {
  if (!date) return { label: 'Attestation manquante', className: 'bg-slate-100 text-slate-500', valid: false }
  const expired = date.slice(0, 10) < new Date().toISOString().slice(0, 10)
  return expired
    ? { label: 'Attestation expiree', className: 'bg-red-50 text-red-700', valid: false }
    : { label: `Valide jusqu'au ${new Intl.DateTimeFormat('fr-FR').format(new Date(date))}`, className: 'bg-emerald-50 text-emerald-700', valid: true }
}

export default function Partenaires() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [type, setType] = useState('')
  const [insurance, setInsurance] = useState('')
  const [editing, setEditing] = useState<Partenaire | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Partenaire | null>(null)
  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderError, setReminderError] = useState('')
  const createRequested = searchParams.get('create') === '1'

  const partners = useInfiniteQuery({
    queryKey: ['partenaires', deferredSearch, type, insurance],
    initialPageParam: '',
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' })
      if (deferredSearch) params.set('search', deferredSearch)
      if (type) params.set('type_partenaire', type)
      if (insurance) params.set('assurance', insurance)
      if (pageParam) params.set('cursor', pageParam)
      return (await api.get<PaginatedResponse<Partenaire>>(`/partenaires?${params}`)).data
    },
    getNextPageParam: (page) => page.pagination.has_more ? page.pagination.cursor : undefined,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['partenaires'] })
    queryClient.invalidateQueries({ queryKey: ['global-search-data'] })
    queryClient.invalidateQueries({ queryKey: ['projets'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const closeForm = () => { setEditing(null); setFormError(''); setSearchParams({}, { replace: true }) }
  const save = useMutation({
    mutationFn: (payload: PartnerFormValues) => editing ? api.patch(`/partenaires/${editing.id}`, payload) : api.post('/partenaires', payload),
    onSuccess: () => { refresh(); closeForm() },
    onError: () => setFormError('Impossible d enregistrer ce partenaire. Verifiez les informations saisies.'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/partenaires/${id}`),
    onSuccess: () => { refresh(); setDeleteTarget(null); setDeleteError('') },
    onError: () => setDeleteError('La suppression a echoue. Reessayez dans quelques instants.'),
  })
  const remindAttestation = useMutation({
    mutationFn: (id: number) => api.post<{ message: string }>(`/partenaires/${id}/relance-attestation`),
    onMutate: () => { setReminderMessage(''); setReminderError('') },
    onSuccess: ({ data }) => setReminderMessage(data.message),
    onError: (error) => setReminderError(apiErrorMessage(error, 'Impossible d envoyer la relance attestation.')),
  })
  const validateAttestation = useMutation({
    mutationFn: (id: number) => api.post<{ message: string }>(`/partenaires/${id}/valider-attestation`),
    onMutate: () => { setReminderMessage(''); setReminderError('') },
    onSuccess: ({ data }) => { setReminderMessage(data.message); refresh() },
    onError: (error) => setReminderError(apiErrorMessage(error, 'Impossible de valider cette attestation.')),
  })
  const rows = partners.data?.pages.flatMap((page) => page.data) ?? []
  const selectClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-blue-500'

  return <>
    <PageHeader title="Partenaires" description="Gerez vos artisans, fournisseurs et autres intervenants." action={<button onClick={() => setSearchParams({ create: '1' })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Nouveau partenaire</button>} />
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
        <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entreprise, activite, SIRET ou contact..." className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        <select value={type} onChange={(event) => setType(event.target.value)} className={selectClass}><option value="">Tous les types</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={insurance} onChange={(event) => setInsurance(event.target.value)} className={selectClass}><option value="">Toutes les attestations</option><option value="valide">Valides</option><option value="expiree">Expirees</option><option value="manquante">Manquantes</option></select>
        <span className="self-center text-xs text-slate-400">{rows.length} partenaire(s)</span>
        {(reminderMessage || reminderError) && <span className={`self-center text-xs font-medium ${reminderError ? 'text-red-600' : 'text-emerald-600'}`}>{reminderError || reminderMessage}</span>}
      </div>

      {partners.isError ? <div className="p-12 text-center"><p className="text-sm text-red-600">Impossible de charger les partenaires.</p><button onClick={() => partners.refetch()} className="mt-3 text-sm font-semibold text-blue-600">Reessayer</button></div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Entreprise</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Assurance</th><th className="px-5 py-3">Activite</th><th className="px-5 py-3">Activite projet</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{partners.isLoading ? <tr><td colSpan={6} className="p-12 text-center text-sm text-slate-400">Chargement...</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-12 text-center"><Building2 className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-400">Aucun partenaire ne correspond aux filtres.</p></td></tr> : rows.map((partner) => { const assurance = insuranceState(partner.attestation_validite); return <tr key={partner.id} className="hover:bg-slate-50/70">
          <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><Building2 className="h-5 w-5" /></div><div><p className="font-semibold text-slate-900">{partner.nom_entreprise}</p><p className="text-xs text-slate-400">{typeLabels[partner.type_partenaire] ?? partner.type_partenaire}{partner.siret ? ` - ${partner.siret}` : ''}</p></div></div></td>
          <td className="px-5 py-4"><div className="space-y-1 text-xs text-slate-500">{partner.email ? <a href={`mailto:${partner.email}`} className="flex items-center gap-1.5 hover:text-blue-600"><Mail className="h-3.5 w-3.5" />{partner.email}</a> : <span>Email non renseigne</span>}{partner.telephone && <a href={`tel:${partner.telephone}`} className="flex items-center gap-1.5 hover:text-blue-600"><Phone className="h-3.5 w-3.5" />{partner.telephone}</a>}</div></td>
          <td className="px-5 py-4"><div className="space-y-2"><div className="flex flex-wrap gap-2"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${assurance.className}`}>{assurance.valid ? <ShieldCheck className="h-3.5 w-3.5" /> : <FileWarning className="h-3.5 w-3.5" />}{assurance.label}</span>{partner.attestation_validated_at && <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" />Validee le {partner.attestation_validated_at}</span>}</div><div className="flex flex-wrap gap-2">{partner.attestation_assurance_download_url && <button type="button" onClick={() => downloadAttestation(partner)} className="flex w-fit items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"><Download className="h-3.5 w-3.5" />Visualiser</button>}{partner.attestation_assurance_download_url && !partner.attestation_validated_at && <button type="button" disabled={validateAttestation.isPending} onClick={() => validateAttestation.mutate(partner.id)} className="flex w-fit items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:text-slate-300"><ShieldCheck className="h-3.5 w-3.5" />Valider</button>}<button type="button" disabled={!partner.email || remindAttestation.isPending} title={partner.email ? 'Envoyer le lien de depot/validation attestation' : 'Email partenaire manquant'} onClick={() => remindAttestation.mutate(partner.id)} className="flex w-fit items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-slate-300"><Send className="h-3.5 w-3.5" />Demander</button></div></div></td>
          <td className="max-w-48 px-5 py-4 text-sm text-slate-500"><p className="truncate">{partner.activite ?? '-'}</p></td>
          <td className="px-5 py-4 text-xs text-slate-500"><p>{partner.projets_count ?? 0} projet(s)</p><p>{partner.devis_count ?? 0} devis</p></td>
          <td className="px-5 py-4"><div className="flex justify-end gap-1"><button aria-label={`Modifier ${partner.nom_entreprise}`} onClick={() => { setEditing(partner); setFormError('') }} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button><button aria-label={`Supprimer ${partner.nom_entreprise}`} onClick={() => { setDeleteTarget(partner); setDeleteError('') }} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
        </tr> })}</tbody>
      </table></div>}
      {partners.hasNextPage && <div className="border-t border-slate-100 p-4 text-center"><button disabled={partners.isFetchingNextPage} onClick={() => partners.fetchNextPage()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{partners.isFetchingNextPage ? 'Chargement...' : 'Afficher plus de partenaires'}</button></div>}
    </section>

    <Modal open={createRequested || Boolean(editing)} title={editing ? 'Modifier le partenaire' : 'Nouveau partenaire'} onClose={closeForm}><PartnerForm key={editing?.id ?? 'new'} partner={editing ?? undefined} busy={save.isPending} error={formError} onSubmit={(payload) => save.mutate(payload)} onClose={closeForm} /></Modal>
    <Modal open={Boolean(deleteTarget)} title="Supprimer le partenaire" onClose={() => setDeleteTarget(null)}><p className="text-sm text-slate-600"><strong>{deleteTarget?.nom_entreprise}</strong> sera retire de vos projets. Les projets, devis, documents et factures associes seront conserves.</p>{deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{remove.isPending ? 'Suppression...' : 'Supprimer definitivement'}</button></div></Modal>
  </>
}

function PartnerForm({ partner, busy, error, onSubmit, onClose }: { partner?: Partenaire; busy: boolean; error: string; onSubmit: (payload: PartnerFormValues) => void; onClose: () => void }) {
  const [values, setValues] = useState<PartnerFormValues>(() => ({ ...emptyPartner, ...partner, attestation_validite: partner?.attestation_validite?.slice(0, 10) ?? '' }))
  const [siretLookup, setSiretLookup] = useState({ loading: false, message: '', error: '' })
  const field = (name: keyof PartnerPayload, value: string) => setValues((current) => ({ ...current, [name]: value }))
  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500'
  const payload = () => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value])) as PartnerFormValues

  const lookupSiret = async () => {
    const identifier = (values.siret ?? '').replace(/\D/g, '')
    if (![9, 14].includes(identifier.length)) {
      setSiretLookup({ loading: false, message: '', error: 'Saisissez un SIREN de 9 chiffres ou un SIRET de 14 chiffres.' })
      return
    }

    setSiretLookup({ loading: true, message: '', error: '' })
    try {
      const { data } = await api.get<{ data: { nom_entreprise?: string; siret?: string; adresse?: string; activite?: string } }>('/partenaires/lookup-siret', { params: { identifier } })
      setValues((current) => ({
        ...current,
        nom_entreprise: data.data.nom_entreprise || current.nom_entreprise,
        siret: data.data.siret || identifier,
        adresse: data.data.adresse || current.adresse,
        activite: data.data.activite || current.activite,
      }))
      setSiretLookup({ loading: false, message: 'Informations entreprise récupérées.', error: '' })
    } catch (lookupError) {
      setSiretLookup({ loading: false, message: '', error: apiErrorMessage(lookupError, 'Aucune entreprise trouvée pour ce numéro.') })
    }
  }

  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(payload()) }}>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Entreprise *</span><input required value={values.nom_entreprise} onChange={(event) => field('nom_entreprise', event.target.value)} className={inputClass} /></label><label><span className="mb-1.5 block text-sm font-medium">Type</span><select value={values.type_partenaire} onChange={(event) => field('type_partenaire', event.target.value)} className={inputClass}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Activite</span><input value={values.activite ?? ''} onChange={(event) => field('activite', event.target.value)} className={inputClass} /></label><label><span className="mb-1.5 block text-sm font-medium">SIRET / SIREN</span><div className="flex gap-2"><input value={values.siret ?? ''} onChange={(event) => { field('siret', event.target.value); setSiretLookup({ loading: false, message: '', error: '' }) }} className={inputClass} /><button type="button" onClick={lookupSiret} disabled={siretLookup.loading} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{siretLookup.loading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Récupérer</button></div>{(siretLookup.message || siretLookup.error) && <p className={`mt-1.5 text-xs ${siretLookup.error ? 'text-red-600' : 'text-emerald-600'}`}>{siretLookup.error || siretLookup.message}</p>}</label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Email</span><input type="email" value={values.email ?? ''} onChange={(event) => field('email', event.target.value)} className={inputClass} /></label><label><span className="mb-1.5 block text-sm font-medium">Telephone</span><input type="tel" value={values.telephone ?? ''} onChange={(event) => field('telephone', event.target.value)} className={inputClass} /></label></div>
    <label className="block"><span className="mb-1.5 block text-sm font-medium">Adresse</span><input value={values.adresse ?? ''} onChange={(event) => field('adresse', event.target.value)} className={inputClass} /></label>
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">L’attestation d’assurance doit être déposée par le partenaire via le lien partagé. Le MOE peut ensuite la visualiser et la valider depuis la liste.</div>
    <label className="block"><span className="mb-1.5 block text-sm font-medium">Notes</span><textarea value={values.notes ?? ''} onChange={(event) => field('notes', event.target.value)} className={`${inputClass} min-h-24`} /></label>
    {error && <p className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enregistrement...' : 'Enregistrer'}</button></div>
  </form>
}
