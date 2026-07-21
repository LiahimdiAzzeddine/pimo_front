import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import type { Client, Projet } from '@/types'

export type ProjectPayload = Record<string, string | number | null>

const phases = [
  { value: 'etude_faisabilite', label: 'Étude de faisabilité' }, { value: 'consultation_entreprises', label: 'Consultation entreprises' },
  { value: 'analyse_offres', label: 'Analyse des offres' }, { value: 'chantier', label: 'Chantier' }, { value: 'cloture', label: 'Clôture' },
]

function ProjectForm({ project, clients, busy, error, onSubmit, onClose }: { project?: Projet; clients: Client[]; busy: boolean; error: string; onSubmit: (payload: ProjectPayload) => void; onClose: () => void }) {
  const [values, setValues] = useState({
    nom: project?.nom ?? '', client_id: project?.client?.id ? String(project.client.id) : '', adresse: project?.adresse ?? '', description: project?.description ?? '',
    project_type: project?.project_type ?? 'renovation_extension', phase: project?.phase ?? 'etude_faisabilite', statut: project?.statut ?? 'actif', type_marche: project?.type_marche ?? 'projet_simple',
    honoraires_mode: project?.honoraires_mode ?? '', taux_honoraires: project?.taux_honoraires ? String(project.taux_honoraires) : '', budget_estimatif: project?.budget_estimatif ? String(project.budget_estimatif) : '',
    date_debut: project?.date_debut?.slice(0, 10) ?? '', date_fin_prevue: project?.date_fin_prevue?.slice(0, 10) ?? '',
  })
  const field = (name: keyof typeof values, value: string) => setValues((current) => ({ ...current, [name]: value }))
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value])))
  }
  const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Nom du projet *</span><input required value={values.nom} onChange={(event) => field('nom', event.target.value)} className={inputClass} /></label>
      <label><span className="mb-1.5 block text-sm font-medium">Client</span><select value={values.client_id} onChange={(event) => field('client_id', event.target.value)} className={inputClass}><option value="">Aucun client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.prenom} {client.nom}</option>)}</select></label>
      <label><span className="mb-1.5 block text-sm font-medium">Type de projet *</span><select required value={values.project_type} onChange={(event) => field('project_type', event.target.value as Projet['project_type'])} className={inputClass}><option value="neuf_residentiel">Neuf résidentiel</option><option value="renovation_extension">Rénovation / extension</option><option value="erp_tertiaire">ERP / tertiaire</option><option value="marche_public">Marché public</option></select></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Adresse</span><input value={values.adresse} onChange={(event) => field('adresse', event.target.value)} className={inputClass} /></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Description</span><textarea rows={3} value={values.description} onChange={(event) => field('description', event.target.value)} className={inputClass} /></label>
    </div>
    <div className="border-t border-slate-100 pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Pilotage</p><div className="grid gap-4 sm:grid-cols-3">
      <label><span className="mb-1.5 block text-sm font-medium">Phase</span><select disabled={!project} value={values.phase} onChange={(event) => field('phase', event.target.value)} className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}>{phases.map((phase) => <option key={phase.value} value={phase.value}>{phase.label}</option>)}</select>{!project && <span className="mt-1 block text-xs text-slate-400">Un nouveau projet démarre en étude de faisabilité.</span>}</label>
      <label><span className="mb-1.5 block text-sm font-medium">Statut</span><select value={values.statut} onChange={(event) => field('statut', event.target.value)} className={inputClass}><option value="actif">Actif</option><option value="en_pause">En pause</option><option value="termine">Terminé</option></select></label>
      <label><span className="mb-1.5 block text-sm font-medium">Marché</span><select value={values.type_marche} onChange={(event) => field('type_marche', event.target.value)} className={inputClass}><option value="projet_simple">Projet simple</option><option value="marche_travaux">Marché travaux</option></select></label>
    </div></div>
    <div className="border-t border-slate-100 pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Budget et calendrier</p><div className="grid gap-4 sm:grid-cols-2">
      <label><span className="mb-1.5 block text-sm font-medium">Budget estimatif</span><input type="number" min="0" step="0.01" value={values.budget_estimatif} onChange={(event) => field('budget_estimatif', event.target.value)} className={inputClass} /></label>
      <label><span className="mb-1.5 block text-sm font-medium">Mode honoraires</span><select value={values.honoraires_mode} onChange={(event) => field('honoraires_mode', event.target.value)} className={inputClass}><option value="">Non défini</option><option value="com_client">Commission client</option><option value="com_artisan">Commission artisan</option><option value="mixte">Mixte</option></select></label>
      <label><span className="mb-1.5 block text-sm font-medium">Taux honoraires (%)</span><input type="number" min="0" max="100" step="0.01" value={values.taux_honoraires} onChange={(event) => field('taux_honoraires', event.target.value)} className={inputClass} /></label><div />
      <label><span className="mb-1.5 block text-sm font-medium">Date de début</span><input type="date" value={values.date_debut} onChange={(event) => field('date_debut', event.target.value)} className={inputClass} /></label>
      <label><span className="mb-1.5 block text-sm font-medium">Fin prévue</span><input type="date" value={values.date_fin_prevue} onChange={(event) => field('date_fin_prevue', event.target.value)} className={inputClass} /></label>
    </div></div>
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Enregistrement...' : project ? 'Enregistrer les modifications' : 'Créer le projet'}</button></div>
  </form>
}

export default function ProjectFormModal(props: { open: boolean; project?: Projet; clients: Client[]; busy: boolean; error: string; onSubmit: (payload: ProjectPayload) => void; onClose: () => void }) {
  return <Modal open={props.open} title={props.project ? 'Modifier le projet' : 'Nouveau projet'} onClose={props.onClose}>{props.open && <ProjectForm key={props.project?.id ?? 'new'} {...props} />}</Modal>
}
