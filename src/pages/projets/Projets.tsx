import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BriefcaseBusiness, CircleCheck, Clock3, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import ProjectFormModal from '@/components/projects/ProjectFormModal'
import type { ProjectPayload } from '@/components/projects/ProjectFormModal'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Client, PaginatedResponse, Projet } from '@/types'

const phaseLabels: Record<string, string> = { etude_faisabilite: 'Étude', consultation_entreprises: 'Consultation', analyse_offres: 'Analyse', chantier: 'Chantier', cloture: 'Clôture' }

export default function Projets() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState('')
  const [phase, setPhase] = useState('')
  const [type, setType] = useState('')
  const [editing, setEditing] = useState<Projet | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Projet | null>(null)
  const [formError, setFormError] = useState('')
  const createRequested = searchParams.get('create') === '1'

  const projects = useQuery({
    queryKey: ['projets', deferredSearch, status, phase, type],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' })
      if (deferredSearch) params.set('search', deferredSearch)
      if (status) params.set('statut', status)
      if (phase) params.set('phase', phase)
      if (type) params.set('project_type', type)
      return (await api.get<PaginatedResponse<Projet>>(`/projets?${params}`)).data.data
    },
  })
  const clients = useQuery({ queryKey: ['project-clients'], queryFn: async () => (await api.get<PaginatedResponse<Client>>('/clients?limit=200')).data.data })
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['projets'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); queryClient.invalidateQueries({ queryKey: ['global-search-data'] }) }
  const save = useMutation({
    mutationFn: (payload: ProjectPayload) => editing ? api.patch(`/projets/${editing.id}`, payload) : api.post('/projets', payload),
    onSuccess: () => { refresh(); closeForm() },
    onError: (error) => setFormError(apiErrorMessage(error, 'Impossible d’enregistrer le projet. Vérifiez les informations, les dates et la phase choisie.')),
  })
  const remove = useMutation({ mutationFn: (id: number) => api.delete(`/projets/${id}`), onSuccess: () => { refresh(); setDeleteTarget(null) } })
  const closeForm = () => { setEditing(undefined); setFormError(''); setSearchParams({}, { replace: true }) }
  const rows = projects.data ?? []
  const selectClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-blue-500'

  return <>
    <PageHeader title="Projets" description="Créez, filtrez et pilotez toutes vos missions de maîtrise d’œuvre." action={<button onClick={() => setSearchParams({ create: '1' })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Nouveau projet</button>} />

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50"><BriefcaseBusiness className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{rows.length}</p><p className="text-xs text-slate-400">Projets affichés</p></div></article>
      <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"><CircleCheck className="h-5 w-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{rows.filter((item) => item.statut === 'actif').length}</p><p className="text-xs text-slate-400">Projets actifs</p></div></article>
      <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50"><Clock3 className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{rows.filter((item) => item.statut === 'en_pause').length}</p><p className="text-xs text-slate-400">En pause</p></div></article>
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Projet, adresse ou client..." className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}><option value="">Tous les statuts</option><option value="actif">Actifs</option><option value="en_pause">En pause</option><option value="termine">Terminés</option></select>
        <select value={phase} onChange={(event) => setPhase(event.target.value)} className={selectClass}><option value="">Toutes les phases</option>{Object.entries(phaseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={type} onChange={(event) => setType(event.target.value)} className={selectClass}><option value="">Tous les types</option><option value="neuf_residentiel">Neuf résidentiel</option><option value="renovation_extension">Rénovation / extension</option><option value="erp_tertiaire">ERP / tertiaire</option><option value="marche_public">Marché public</option></select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Projet</th><th className="px-5 py-3">Client</th><th className="px-5 py-3">Phase</th><th className="px-5 py-3">Avancement documentaire</th><th className="px-5 py-3">Budget</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{projects.isLoading ? <tr><td colSpan={7} className="p-12 text-center text-sm text-slate-400">Chargement...</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-sm text-slate-400">Aucun projet ne correspond aux filtres.</td></tr> : rows.map((project) => { const total = project.documents_count ?? 0; const completed = project.completed_documents_count ?? 0; const progress = total ? Math.round((completed / total) * 100) : 0; return <tr key={project.id} className="hover:bg-slate-50/70">
          <td className="px-5 py-4"><Link to={`/projets/${project.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{project.nom}</Link><p className="mt-0.5 max-w-56 truncate text-xs text-slate-400">{project.adresse ?? project.project_type?.replaceAll('_', ' ')}</p></td>
          <td className="px-5 py-4 text-sm text-slate-600">{project.client ? `${project.client.prenom ?? ''} ${project.client.nom}`.trim() : <span className="text-slate-300">Non rattache</span>}</td>
          <td className="px-5 py-4"><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{project.phase_label ?? phaseLabels[project.phase] ?? project.phase}</span>{Boolean(project.phase_alerts?.length) && <p className="mt-1 max-w-40 truncate text-[11px] text-amber-600">{project.phase_alerts?.[0]}</p>}</td>
          <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div><span className="text-xs font-medium text-slate-500">{completed}/{total}</span></div></td>
          <td className="px-5 py-4 text-sm font-semibold text-slate-700">{project.budget_estimatif ? `${Number(project.budget_estimatif).toLocaleString('fr-FR')} EUR` : '-'}</td><td className="px-5 py-4"><StatusBadge value={project.statut} /></td>
          <td className="px-5 py-4"><div className="flex justify-end gap-1"><button aria-label={`Modifier ${project.nom}`} onClick={() => { setEditing(project); setFormError('') }} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button><button aria-label={`Supprimer ${project.nom}`} onClick={() => setDeleteTarget(project)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td>
        </tr> })}</tbody></table></div>
    </section>

    <ProjectFormModal open={createRequested || Boolean(editing)} project={editing} clients={clients.data ?? []} busy={save.isPending} error={formError} onSubmit={(payload) => save.mutate(payload)} onClose={closeForm} />
    <Modal open={Boolean(deleteTarget)} title="Supprimer le projet" onClose={() => setDeleteTarget(null)}><p className="text-sm text-slate-600">Cette action supprimera le projet <strong>{deleteTarget?.nom}</strong> et toutes ses données associées. Cette opération est irréversible.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{remove.isPending ? 'Suppression...' : 'Supprimer définitivement'}</button></div></Modal>
  </>
}
