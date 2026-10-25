import { useMemo, useState } from 'react'
import { AlertTriangle, Archive, ArrowRight, Check, ChevronRight, Circle, Clock3, FileText, FolderOpen, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import type { Document, ProjectStep, Projet } from '@/types'
import AdministrativeDetail from './AdministrativeDetail'
import { DceOfferDetail, SiteWorkDetail } from './AdvancedPhaseDetail'
import ClosureDetail from './ClosureDetail'
import AutomationPanel from './AutomationPanel'
import FaisabiliteDetail from './FaisabiliteDetail'
import { CHANTIER_PHASES, phaseDefinition, phasePosition, type PhaseDefinition, type StepDefinition } from './workflow'

interface Props {
  projects: Projet[]
  phaseFilter: string
  selectedProjectId?: number
  selectedPhaseValue?: string
  selectedStepCode?: string
  onPhaseFilterChange: (value: string) => void
  onProjectChange: (project: Projet) => void
  onPhaseChange: (phase: PhaseDefinition) => void
  onStepChange: (step: StepDefinition) => void
  onChanged: () => Promise<unknown> | void
}

type StepStatus = ProjectStep['status']
const completed = ['valide', 'signe', 'archive']
const phaseText = (phase: PhaseDefinition) => phase.soft.split(' ')[1]
const normalizeCode = (code: string) => code.replaceAll('-', '_')
const trackedPhase = (project: Projet, phase: PhaseDefinition) => project.tracking_phases?.find((item) => item.definition.code === phase.value)
const trackedStep = (project: Projet, phase: PhaseDefinition, step: StepDefinition) => trackedPhase(project, phase)?.steps.find((item) => item.definition.code === normalizeCode(step.code))

const age = (value?: string) => {
  if (!value) return { label: 'Activité inconnue', late: false }
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
  return { label: days === 0 ? 'Aujourd’hui' : `Il y a ${days} jour${days > 1 ? 's' : ''}`, late: days > 30 }
}

const phaseState = (project: Projet, phase: PhaseDefinition) => {
  const stored = trackedPhase(project, phase)?.status
  if (stored) return stored
  const current = phasePosition(project.phase)
  const target = phasePosition(phase.value)
  if (project.statut === 'termine' || target < current) return 'terminee'
  return target === current ? 'en_cours' : 'a_faire'
}

const stepDocuments = (project: Projet, phase: PhaseDefinition, step: StepDefinition) => (project.documents ?? []).filter((document) => {
  if (document.phase && document.phase !== phase.value) return false
  if (step.documentTypes?.includes(document.type_document)) return true
  const name = `${document.nom} ${document.document_type?.libelle ?? ''}`.toLocaleLowerCase('fr')
  return step.keywords?.some((keyword) => name.includes(keyword.toLocaleLowerCase('fr'))) ?? false
})

const stepState = (project: Projet, phase: PhaseDefinition, step: StepDefinition, index: number) => {
  const stored = trackedStep(project, phase, step)?.status
  if (stored) return stored
  const state = phaseState(project, phase)
  if (state !== 'en_cours') return state
  if (project.phase_checks_summary?.[index]?.done) return 'terminee'
  const documents = stepDocuments(project, phase, step)
  if (documents.some((document) => completed.includes(document.workflow_status))) return 'terminee'
  return documents.length || index === 0 ? 'en_cours' : 'a_faire'
}

const apiError = (error: unknown) => {
  const candidate = error as { response?: { data?: { error?: { message?: string; details?: Record<string, string[]> } } } }
  const payload = candidate.response?.data?.error
  return Object.values(payload?.details ?? {}).flat()[0] ?? payload?.message ?? 'Une erreur est survenue.'
}

function StateIcon({ state }: { state: string }) {
  if (state === 'terminee' || state === 'sans_objet') return <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500 text-white"><Check className="h-4 w-4" /></span>
  if (state === 'en_cours') return <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-100 text-blue-600"><Clock3 className="h-4 w-4" /></span>
  if (state === 'bloquee') return <span className="grid h-6 w-6 place-items-center rounded-lg bg-red-100 text-red-600"><AlertTriangle className="h-4 w-4" /></span>
  return <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-slate-300"><Circle className="h-3 w-3" /></span>
}

export default function SuiviWorkspace(props: Props) {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'workflow' | 'documents'>('workflow')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const filtered = useMemo(() => props.projects.filter((project) => {
    const term = search.trim().toLocaleLowerCase('fr')
    return (props.phaseFilter === 'all' || project.phase === props.phaseFilter) && (!term || `${project.nom} ${project.adresse ?? ''} ${project.client?.nom ?? ''}`.toLocaleLowerCase('fr').includes(term))
  }), [props.projects, props.phaseFilter, search])
  const project = filtered.find((item) => item.id === props.selectedProjectId) ?? filtered[0]
  const phase = phaseDefinition(props.selectedPhaseValue ?? project?.phase)
  const step = phase.steps.find((item) => item.code === props.selectedStepCode) ?? phase.steps[0]
  const counts = Object.fromEntries(CHANTIER_PHASES.map((item) => [item.value, props.projects.filter((projectItem) => projectItem.phase === item.value).length]))

  const run = async (request: () => Promise<unknown>) => {
    setBusy(true)
    setError(undefined)
    try {
      await request()
      await props.onChanged()
    } catch (caught) {
      setError(apiError(caught))
    } finally {
      setBusy(false)
    }
  }

  const abandon = (item: Projet) => {
    const reason = window.prompt('Pourquoi classer ce dossier sans suite ?')?.trim()
    if (reason) void run(() => api.post(`/projets/${item.id}/sans-suite`, { reason }))
  }
  const archive = (item: Projet) => {
    if (window.confirm('Archiver définitivement ce dossier terminé ?')) void run(() => api.post(`/projets/${item.id}/archive`))
  }

  return <>
    <nav aria-label="Filtres par phase" className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
      <Filter active={props.phaseFilter === 'all'} onClick={() => props.onPhaseFilterChange('all')} label="Tous" count={props.projects.length} />
      {CHANTIER_PHASES.map((item) => <Filter key={item.value} active={props.phaseFilter === item.value} onClick={() => props.onPhaseFilterChange(item.value)} label={item.shortLabel} count={counts[item.value]} phase={item} />)}
    </nav>
    {error && <div role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
      <div className={`grid min-h-[650px] xl:grid-cols-[minmax(220px,.85fr)_minmax(220px,.8fr)_minmax(240px,.9fr)_minmax(380px,1.55fr)] ${busy ? 'pointer-events-none opacity-70' : ''}`}>
        <ProjectList projects={filtered} selectedId={project?.id} search={search} onSearch={setSearch} onSelect={(item) => { props.onProjectChange(item); setMode('workflow') }} />
        {project ? <ProjectNav project={project} phase={phase} mode={mode} onMode={setMode} onPhase={props.onPhaseChange} onPriority={(priority) => run(() => api.patch(`/projets/${project.id}`, { priority }))} onAdvance={(next) => run(() => api.patch(`/projets/${project.id}`, { phase: next }))} onAbandon={() => abandon(project)} onArchive={() => archive(project)} /> : <Empty text="Sélectionnez un dossier" border />}
        {project && mode === 'workflow' ? <StepList project={project} phase={phase} selected={step} onSelect={props.onStepChange} /> : project ? <DocumentList project={project} /> : <Empty text="Sélectionnez un dossier" border />}
        {project && mode === 'workflow' ? <StepDetail project={project} phase={phase} step={step} onUpdate={(id, payload) => run(() => api.patch(`/project-steps/${id}/status`, payload))} onConfirm={(id) => run(() => api.post(`/project-steps/${id}/confirm-manually`))} onChanged={props.onChanged} /> : project ? <DocumentSummary project={project} onChanged={props.onChanged} /> : <Empty text="Sélectionnez une étape" />}
      </div>
    </section>
  </>
}

function Filter({ active, onClick, label, count, phase }: { active: boolean; onClick: () => void; label: string; count: number; phase?: PhaseDefinition }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold ${active ? `${phase?.accent ?? 'bg-slate-950'} text-white` : phase?.soft ?? 'text-slate-600 hover:bg-slate-50'}`}>{label} <span className="ml-1 opacity-70">{count}</span></button>
}

function ProjectList({ projects, selectedId, search, onSearch, onSelect }: { projects: Projet[]; selectedId?: number; search: string; onSearch: (value: string) => void; onSelect: (project: Projet) => void }) {
  return <div className="border-b border-slate-200 xl:border-b-0 xl:border-r"><div className="border-b border-slate-100 p-4"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">Plans / Dossiers</p><label className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Rechercher" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div><div className="max-h-[560px] overflow-y-auto p-2">{projects.length ? projects.map((project) => { const current = phaseDefinition(project.phase); const activity = age(project.last_activity_at ?? project.updated_at); return <button key={project.id} onClick={() => onSelect(project)} className={`mb-1 w-full rounded-xl border-l-4 p-3 text-left ${selectedId === project.id ? `${current.soft} ${current.border}` : 'border-transparent hover:bg-slate-50'}`}><p className="truncate text-sm font-bold">{project.nom}</p><div className="mt-1 flex items-center gap-2"><p className={`text-[11px] font-bold uppercase ${phaseText(current)}`}>{current.shortLabel}</p>{project.sub_status && <span className="truncate text-[10px] text-slate-400">· {project.sub_status}</span>}</div><p className={`mt-1 text-xs ${activity.late ? 'text-red-500' : 'text-emerald-600'}`}>{activity.label}</p></button> }) : <Empty text="Aucun dossier dans ce filtre" />}</div></div>
}

interface ProjectNavProps {
  project: Projet
  phase: PhaseDefinition
  mode: 'workflow' | 'documents'
  onMode: (value: 'workflow' | 'documents') => void
  onPhase: (value: PhaseDefinition) => void
  onPriority: (value: Projet['priority']) => void
  onAdvance: (value: string) => void
  onAbandon: () => void
  onArchive: () => void
}

function ProjectNav({ project, phase, mode, onMode, onPhase, onPriority, onAdvance, onAbandon, onArchive }: ProjectNavProps) {
  const currentIndex = CHANTIER_PHASES.findIndex((item) => item.value === project.phase)
  const next = CHANTIER_PHASES[currentIndex + 1]
  return <div className="border-b border-slate-200 xl:border-b-0 xl:border-r"><div className="border-b border-slate-100 p-4"><div className="flex justify-between gap-3"><div><h2 className="font-bold">{project.nom}</h2><p className="mt-1 line-clamp-2 text-xs text-slate-400">{project.adresse ?? project.client?.nom ?? 'Informations du dossier'}</p></div><span title="Contacts" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Users className="h-4 w-4" /></span></div><label className="mt-3 block text-[10px] font-bold uppercase text-slate-400">Priorité<select value={project.priority ?? 'normal'} onChange={(event) => onPriority(event.target.value as Projet['priority'])} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold normal-case text-slate-700"><option value="normal">Normale</option><option value="sensible">Sensible</option><option value="critique">Critique</option></select></label></div><div className="grid grid-cols-2 gap-2 p-3"><Tab active={mode === 'documents'} onClick={() => onMode('documents')} icon={FolderOpen} label="Documents" /><Tab active={mode === 'workflow'} onClick={() => onMode('workflow')} icon={FileText} label="Actions" /></div><div className="p-2">{CHANTIER_PHASES.map((item) => <button key={item.value} onClick={() => { onMode('workflow'); onPhase(item) }} className={`flex w-full items-center gap-3 rounded-xl border-l-4 px-3 py-3 text-left ${mode === 'workflow' && item.value === phase.value ? `${item.soft} ${item.border}` : 'border-transparent hover:bg-slate-50'}`}><StateIcon state={phaseState(project, item)} /><span className="flex-1 text-sm font-semibold">{item.label}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>)}</div><div className="mx-4 space-y-2 border-t border-slate-100 py-4">{next && <button type="button" onClick={() => onAdvance(next.value)} className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Passer à « {next.shortLabel} »</button>}<button type="button" onClick={onAbandon} className="w-full rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">Classer sans suite</button><button type="button" onClick={onArchive} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"><Archive className="h-4 w-4" />Archiver ce dossier</button></div></div>
}

function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof FileText; label: string }) {
  return <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-4 w-4" />{label}</button>
}

function StepList({ project, phase, selected, onSelect }: { project: Projet; phase: PhaseDefinition; selected: StepDefinition; onSelect: (step: StepDefinition) => void }) {
  return <div className="border-b border-slate-200 xl:border-b-0 xl:border-r"><div className={`border-b border-l-4 border-slate-100 p-4 ${phase.border}`}><p className={`text-xs font-bold uppercase ${phaseText(phase)}`}>{phase.label}</p><p className="mt-1 text-xs text-slate-400">{phase.steps.length} étapes</p></div><div className="p-2">{phase.steps.map((step, index) => <button key={step.code} onClick={() => onSelect(step)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left ${step.code === selected.code ? 'bg-slate-100' : 'hover:bg-slate-50'}`}><StateIcon state={stepState(project, phase, step, index)} /><span className="flex-1 text-sm font-semibold leading-5 text-slate-700">{step.label}</span></button>)}</div><div className="mx-3 border-t border-slate-100 py-4"><Link to={`/projets/${project.id}`} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white">Ouvrir la fiche <ArrowRight className="h-4 w-4" /></Link></div></div>
}

function StepDetail({ project, phase, step, onUpdate, onConfirm, onChanged }: { project: Projet; phase: PhaseDefinition; step: StepDefinition; onUpdate: (id: number, payload: { status: StepStatus; notes?: string; data?: Record<string, unknown> }) => void; onConfirm: (id: number) => void; onChanged: () => Promise<unknown> | void }) {
  const index = phase.steps.findIndex((item) => item.code === step.code)
  const state = stepState(project, phase, step, index)
  const persisted = trackedStep(project, phase, step)
  const documents = stepDocuments(project, phase, step)
  const labels: Record<StepStatus, string> = { a_faire: 'À faire', en_cours: 'En cours', terminee: 'Terminée', sans_objet: 'Sans objet', bloquee: 'Bloquée' }
  const specializedDetail = phase.value === 'etude_faisabilite'
    ? <FaisabiliteDetail project={project} stepCode={step.code} trackingStep={persisted} onSave={(payload) => persisted && onUpdate(persisted.id, payload)} onChanged={onChanged} />
    : phase.value === 'consultation_entreprises'
      ? <AdministrativeDetail project={project} stepCode={step.code} trackingStep={persisted} onSave={(payload) => persisted && onUpdate(persisted.id, payload)} onChanged={onChanged} />
      : phase.value === 'analyse_offres'
        ? <DceOfferDetail project={project} stepCode={step.code} trackingStep={persisted} onSave={(payload) => persisted && onUpdate(persisted.id, payload)} onChanged={onChanged} />
        : phase.value === 'chantier'
          ? <SiteWorkDetail project={project} stepCode={step.code} trackingStep={persisted} onSave={(payload) => persisted && onUpdate(persisted.id, payload)} onChanged={onChanged} />
          : phase.value === 'cloture'
            ? <ClosureDetail project={project} stepCode={step.code} trackingStep={persisted} onSave={(payload) => persisted && onUpdate(persisted.id, payload)} onChanged={onChanged} />
      : <div className="mt-5 rounded-2xl border border-slate-200 p-4"><div className="flex justify-between"><h3 className="text-sm font-bold">Documents associés</h3><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">{documents.length}</span></div>{documents.length ? <div className="mt-3 divide-y divide-slate-100">{documents.map((document) => <DocumentRow key={document.id} document={document} />)}</div> : <p className="mt-4 text-sm text-slate-400">Aucun fichier correspondant détecté.</p>}</div>
  return <div className="p-5 lg:p-6"><p className={`text-xs font-bold uppercase ${phaseText(phase)}`}>{phase.label}</p><h2 className="mt-1 text-xl font-bold">{step.label}</h2><div className="mt-4 flex flex-wrap gap-2">{(Object.keys(labels) as StepStatus[]).map((value) => <button type="button" disabled={!persisted} onClick={() => persisted && onUpdate(persisted.id, { status: value })} key={value} className={`rounded-xl px-3 py-2 text-xs font-semibold ${state === value ? value === 'terminee' || value === 'sans_objet' ? 'bg-emerald-500 text-white' : value === 'en_cours' ? 'bg-blue-600 text-white' : value === 'bloquee' ? 'bg-red-600 text-white' : 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'} disabled:cursor-not-allowed disabled:opacity-50`}>{labels[value]}</button>)}</div><p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm italic leading-6 text-slate-600">{step.description}</p>{specializedDetail}{project.phase === phase.value && project.phase_alerts?.length ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold text-amber-900">Points à compléter</p><ul className="mt-2 space-y-1 text-xs text-amber-800">{project.phase_alerts.slice(0, 3).map((alert) => <li key={alert}>• {alert}</li>)}</ul></div></div></div> : null}<div className="mt-6 flex flex-wrap gap-2"><button type="button" disabled={!persisted || state === 'terminee'} onClick={() => persisted && onConfirm(persisted.id)} className="rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Confirmer manuellement</button><Link to={`/projets/${project.id}`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Fiche complète <ArrowRight className="h-4 w-4" /></Link></div></div>
}

function DocumentRow({ document }: { document: Document }) { return <div className="flex items-center gap-3 py-3"><FileText className="h-4 w-4 text-blue-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{document.nom}</p><p className="text-[11px] text-slate-400">{document.workflow_status.replaceAll('_', ' ')}</p></div>{completed.includes(document.workflow_status) && <Check className="h-4 w-4 text-emerald-500" />}</div> }
function DocumentList({ project }: { project: Projet }) { const documents = project.documents ?? []; return <div className="border-b border-slate-200 xl:border-b-0 xl:border-r"><div className="border-b border-slate-100 p-4"><p className="text-xs font-bold uppercase text-slate-500">Documents</p><p className="mt-1 text-xs text-slate-400">{documents.length} document(s)</p></div><div className="max-h-[560px] overflow-y-auto p-3">{documents.length ? documents.map((item) => <DocumentRow key={item.id} document={item} />) : <Empty text="Aucun document associé" />}</div></div> }
function DocumentSummary({ project, onChanged }: { project: Projet; onChanged: () => Promise<unknown> | void }) { const docs = project.documents ?? []; const count = docs.filter((item) => completed.includes(item.workflow_status)).length; return <div className="p-6"><p className="text-xs font-bold uppercase text-blue-600">Dossier documentaire</p><h2 className="mt-1 text-xl font-bold">{project.nom}</h2><div className="mt-6 rounded-2xl bg-slate-50 p-5"><p className="text-3xl font-bold">{count}/{docs.length}</p><p className="text-sm text-slate-500">documents finalisés</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-600" style={{ width: `${docs.length ? count / docs.length * 100 : 0}%` }} /></div></div><Link to={`/projets/${project.id}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Gérer les documents <ArrowRight className="h-4 w-4" /></Link><AutomationPanel project={project} onChanged={onChanged} /></div> }
function Empty({ text, border = false }: { text: string; border?: boolean }) { return <div className={`grid min-h-52 place-items-center p-6 text-center text-sm italic text-slate-400 ${border ? 'border-b border-slate-200 xl:border-b-0 xl:border-r' : ''}`}>{text}</div> }
