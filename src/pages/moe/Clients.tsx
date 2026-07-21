import { useDeferredValue, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Mail, Pencil, Phone, Plus, RotateCw, Search, Trash2, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import type { Client, PaginatedResponse } from '@/types'

type ClientPayload = Omit<Client, 'id' | 'projets_count'>

const emptyClient: ClientPayload = {
  nom: '', prenom: '', civilite: undefined, type_client: 'particulier', email: '', telephone: '',
  adresse: '', entreprise_nom: '', kbis: '', notes: '',
}

export default function Clients() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [type, setType] = useState('')
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const createRequested = searchParams.get('create') === '1'

  const clients = useInfiniteQuery({
    queryKey: ['clients', deferredSearch, type],
    initialPageParam: '',
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' })
      if (deferredSearch) params.set('search', deferredSearch)
      if (type) params.set('type_client', type)
      if (pageParam) params.set('cursor', pageParam)
      return (await api.get<PaginatedResponse<Client>>(`/clients?${params}`)).data
    },
    getNextPageParam: (page) => page.pagination.has_more ? page.pagination.cursor : undefined,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] })
    queryClient.invalidateQueries({ queryKey: ['project-clients'] })
    queryClient.invalidateQueries({ queryKey: ['global-search-data'] })
    queryClient.invalidateQueries({ queryKey: ['projets'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const closeForm = () => { setEditing(null); setFormError(''); setSearchParams({}, { replace: true }) }
  const save = useMutation({
    mutationFn: (payload: ClientPayload) => editing ? api.patch(`/clients/${editing.id}`, payload) : api.post('/clients', payload),
    onSuccess: () => { refresh(); closeForm() },
    onError: () => setFormError('Impossible d enregistrer ce client. Verifiez les champs obligatoires.'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => { refresh(); setDeleteTarget(null); setDeleteError('') },
    onError: () => setDeleteError('La suppression a echoue. Reessayez dans quelques instants.'),
  })
  const rows = clients.data?.pages.flatMap((page) => page.data) ?? []
  const selectClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-blue-500'

  return <>
    <PageHeader title="Clients" description="Centralisez les coordonnees et les projets de vos maitres d'ouvrage." action={<button onClick={() => setSearchParams({ create: '1' })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Nouveau client</button>} />

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
        <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, entreprise, email ou telephone..." className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        <select value={type} onChange={(event) => setType(event.target.value)} className={selectClass}><option value="">Tous les clients</option><option value="particulier">Particuliers</option><option value="entreprise">Entreprises</option></select>
        <span className="self-center text-xs text-slate-400">{rows.length} client(s)</span>
      </div>

      {clients.isError ? <div className="p-12 text-center"><p className="text-sm text-red-600">Impossible de charger les clients.</p><button onClick={() => clients.refetch()} className="mt-3 text-sm font-semibold text-blue-600">Reessayer</button></div> : <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Client</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Adresse</th><th className="px-5 py-3">Projets</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{clients.isLoading ? <tr><td colSpan={5} className="p-12 text-center text-sm text-slate-400">Chargement...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="p-12 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-400">Aucun client ne correspond a la recherche.</p></td></tr> : rows.map((client) => <tr key={client.id} className="hover:bg-slate-50/70">
          <td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${client.type_client === 'entreprise' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>{client.type_client === 'entreprise' ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</div><div><p className="font-semibold text-slate-900">{client.type_client === 'entreprise' ? client.entreprise_nom : `${client.prenom ?? ''} ${client.nom}`.trim()}</p>{client.type_client === 'entreprise' && <p className="text-xs text-slate-400">Contact : {client.prenom} {client.nom}</p>}</div></div></td>
          <td className="px-5 py-4"><div className="space-y-1 text-xs text-slate-500">{client.email ? <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-blue-600"><Mail className="h-3.5 w-3.5" />{client.email}</a> : <span>Email non renseigne</span>}{client.telephone && <a href={`tel:${client.telephone}`} className="flex items-center gap-1.5 hover:text-blue-600"><Phone className="h-3.5 w-3.5" />{client.telephone}</a>}</div></td>
          <td className="max-w-64 px-5 py-4 text-sm text-slate-500"><p className="truncate">{client.adresse ?? '-'}</p></td>
          <td className="px-5 py-4"><ProjectCountBadge client={client} /></td>
          <td className="px-5 py-4"><div className="flex justify-end gap-1"><button aria-label={`Modifier ${client.nom}`} onClick={() => { setEditing(client); setFormError('') }} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button><button aria-label={`Supprimer ${client.nom}`} onClick={() => { setDeleteTarget(client); setDeleteError('') }} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
        </tr>)}</tbody>
      </table></div>}
      {clients.hasNextPage && <div className="border-t border-slate-100 p-4 text-center"><button disabled={clients.isFetchingNextPage} onClick={() => clients.fetchNextPage()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{clients.isFetchingNextPage ? 'Chargement...' : 'Afficher plus de clients'}</button></div>}
    </section>

    <Modal open={createRequested || Boolean(editing)} title={editing ? 'Modifier le client' : 'Nouveau client'} onClose={closeForm}><ClientForm key={editing?.id ?? 'new'} client={editing ?? undefined} busy={save.isPending} error={formError} onSubmit={(payload) => save.mutate(payload)} onClose={closeForm} /></Modal>
    <Modal open={Boolean(deleteTarget)} title="Supprimer le client" onClose={() => setDeleteTarget(null)}><p className="text-sm text-slate-600">Le client <strong>{deleteTarget?.entreprise_nom ?? `${deleteTarget?.prenom ?? ''} ${deleteTarget?.nom ?? ''}`}</strong> sera supprime. Ses {deleteTarget?.projets_count ?? 0} projet(s) seront conserves mais ne seront plus rattaches a ce client.</p>{deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{remove.isPending ? 'Suppression...' : 'Supprimer definitivement'}</button></div></Modal>
  </>
}

function ProjectCountBadge({ client }: { client: Client }) {
  const projects = client.projets ?? []
  const count = client.projets_count ?? projects.length

  return <div className="group relative inline-flex">
    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{count} projet(s)</span>
    <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg group-hover:block group-focus-within:block">
      <p className="mb-2 font-semibold text-slate-700">Projets rattaches</p>
      {projects.length > 0 ? <ul className="space-y-1.5 text-slate-500">
        {projects.map((project) => <li key={project.id} className="truncate">{project.nom}</li>)}
      </ul> : <p className="text-slate-400">Aucun projet rattache</p>}
    </div>
  </div>
}

function ClientForm({ client, busy, error, onSubmit, onClose }: { client?: Client; busy: boolean; error: string; onSubmit: (payload: ClientPayload) => void; onClose: () => void }) {
  const [values, setValues] = useState<ClientPayload>(() => ({ ...emptyClient, ...client }))
  const [sirenLookup, setSirenLookup] = useState({ loading: false, message: '', error: '' })
  const field = (name: keyof ClientPayload, value: string) => setValues((current) => ({ ...current, [name]: value }))
  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500'
  const payload = () => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value])) as ClientPayload

  const lookupSiren = async () => {
    const identifier = (values.kbis ?? '').replace(/\D/g, '')
    if (![9, 14].includes(identifier.length)) {
      setSirenLookup({ loading: false, message: '', error: 'Saisissez un SIREN de 9 chiffres ou un SIRET de 14 chiffres.' })
      return
    }

    setSirenLookup({ loading: true, message: '', error: '' })
    try {
      const { data } = await api.get<{ data: { nom_entreprise?: string; siret?: string; adresse?: string } }>('/partenaires/lookup-siret', { params: { identifier } })
      setValues((current) => ({
        ...current,
        entreprise_nom: data.data.nom_entreprise || current.entreprise_nom,
        kbis: data.data.siret || identifier,
        adresse: data.data.adresse || current.adresse,
      }))
      setSirenLookup({ loading: false, message: 'Informations entreprise recuperees.', error: '' })
    } catch (lookupError) {
      setSirenLookup({ loading: false, message: '', error: apiErrorMessage(lookupError, 'Aucune entreprise trouvee pour ce numero.') })
    }
  }

  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(payload()) }}>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Type de client</span><select value={values.type_client} onChange={(event) => field('type_client', event.target.value)} className={inputClass}><option value="particulier">Particulier</option><option value="entreprise">Entreprise</option></select></label><label><span className="mb-1.5 block text-sm font-medium">Civilite</span><select value={values.civilite ?? ''} onChange={(event) => field('civilite', event.target.value)} className={inputClass}><option value="">Non renseignee</option>{['Monsieur', 'Madame', 'Mesdames', 'Messieurs'].map((value) => <option key={value}>{value}</option>)}</select></label></div>
    {values.type_client === 'entreprise' && <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Entreprise *</span><input required value={values.entreprise_nom ?? ''} onChange={(event) => field('entreprise_nom', event.target.value)} className={inputClass} /></label><label><span className="mb-1.5 block text-sm font-medium">KBIS / SIREN</span><div className="flex gap-2"><input value={values.kbis ?? ''} onChange={(event) => { field('kbis', event.target.value); setSirenLookup({ loading: false, message: '', error: '' }) }} className={inputClass} /><button type="button" onClick={lookupSiren} disabled={sirenLookup.loading} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{sirenLookup.loading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Recuperer</button></div>{(sirenLookup.message || sirenLookup.error) && <p className={`mt-1.5 text-xs ${sirenLookup.error ? 'text-red-600' : 'text-emerald-600'}`}>{sirenLookup.error || sirenLookup.message}</p>}</label></div>}
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Nom *</span><input required value={values.nom} onChange={(event) => field('nom', event.target.value)} className={inputClass} /></label><label><span className="mb-1.5 block text-sm font-medium">Prenom</span><input value={values.prenom ?? ''} onChange={(event) => field('prenom', event.target.value)} className={inputClass} /></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Email</span><input type="email" value={values.email ?? ''} onChange={(event) => field('email', event.target.value)} className={inputClass} /></label><label><span className="mb-1.5 block text-sm font-medium">Telephone</span><input type="tel" value={values.telephone ?? ''} onChange={(event) => field('telephone', event.target.value)} className={inputClass} /></label></div>
    <label className="block"><span className="mb-1.5 block text-sm font-medium">Adresse</span><input value={values.adresse ?? ''} onChange={(event) => field('adresse', event.target.value)} className={inputClass} /></label>
    <label className="block"><span className="mb-1.5 block text-sm font-medium">Notes</span><textarea value={values.notes ?? ''} onChange={(event) => field('notes', event.target.value)} className={`${inputClass} min-h-24`} /></label>
    {error && <p className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enregistrement...' : 'Enregistrer'}</button></div>
  </form>
}
