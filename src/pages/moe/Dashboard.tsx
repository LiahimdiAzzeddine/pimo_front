import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, BellRing, BriefcaseBusiness, CircleCheck, Clock3, FileText, ReceiptText, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import type { Document, Projet, Relance } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'

interface DashboardData {
  stats: {
    active_projects: number
    waiting_actions: number
    completed_documents: number
    outstanding_amount: number
    scheduled_reminders: number
    deadlines_at_risk: number
  }
  recent_projects: Projet[]
  alerts: { reminders: Relance[]; documents: Document[] }
}

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value))
  : null

const projectPhaseGroups = [
  { key: 'etude_faisabilite', label: 'Étude de faisabilité', phases: ['etude_faisabilite'] },
  { key: 'dossier_administratif', label: 'Dossier administratif', phases: ['dossier_administratif'] },
  { key: 'consultation', label: 'Consultation', phases: ['consultation', 'consultation_entreprises'] },
  { key: 'chantier', label: 'Chantier', phases: ['chantier'] },
  { key: 'cloture', label: 'Clôture', phases: ['cloture'] },
]

export default function Dashboard() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardData>('/dashboard')).data,
    staleTime: 30_000,
  })

  if (query.isPending) return <DashboardLoading />

  if (query.isError) return <>
    <PageHeader title={`Bonjour${user?.name ? ` ${user.name}` : ''}`} description="Impossible de charger les priorites de votre activite." />
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
      <p className="mt-3 font-semibold text-red-950">Le tableau de bord est indisponible.</p>
      <p className="mt-1 text-sm text-red-700">Verifiez votre connexion puis reessayez.</p>
      <button type="button" onClick={() => query.refetch()} className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
        <RotateCw className="h-4 w-4" /> Reessayer
      </button>
    </div>
  </>

  const data = query.data
  const groupedRecentProjects = projectPhaseGroups.map((group) => ({
    ...group,
    projects: data.recent_projects.filter((project) => group.phases.includes(project.phase)).slice(0, 4),
  }))
  const stats = [
    { label: 'Projets actifs', value: data.stats.active_projects, icon: BriefcaseBusiness, color: 'bg-blue-600' },
    { label: 'Actions attendues', value: data.stats.waiting_actions, icon: Clock3, color: 'bg-amber-500' },
    { label: 'Echeances a risque', value: data.stats.deadlines_at_risk, icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Relances programmees', value: data.stats.scheduled_reminders, icon: BellRing, color: 'bg-cyan-600' },
    { label: 'Documents termines', value: data.stats.completed_documents, icon: CircleCheck, color: 'bg-emerald-500' },
    { label: 'Montant a suivre', value: `${data.stats.outstanding_amount.toLocaleString('fr-FR')} EUR`, icon: ReceiptText, color: 'bg-violet-500' },
  ]

  return <>
    <PageHeader title={`Bonjour${user?.name ? ` ${user.name}` : ''}`} description="Voici les priorites de votre activite MOE aujourd'hui." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {stats.map(({ label, value, icon: Icon, color }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl text-white ${color}`}><Icon className="h-5 w-5" /></div>
        <p className="text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p>
      </article>)}
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div><h2 className="font-bold">Projets recents</h2><p className="text-xs text-slate-400">Vos dernieres missions mises a jour</p></div>
          <Link to="/projets" className="flex items-center gap-1 text-sm font-semibold text-blue-600">Tout voir <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {data.recent_projects.length === 0
          ? <div className="p-10 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">Aucun projet pour le moment.</p><Link to="/projets" className="mt-3 inline-block text-sm font-semibold text-blue-600">Creer un projet</Link></div>
          : <div className="divide-y divide-slate-100">{groupedRecentProjects.map((group) => <div key={group.key} className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-800">{group.label}</h3>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{group.projects.length}</span>
            </div>
            {group.projects.length === 0
              ? <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-400">Aucun projet récent dans cette phase.</p>
              : <div className="space-y-2">{group.projects.map((project) => {
                const total = project.documents_count ?? 0
                const completed = project.completed_documents_count ?? 0
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0
                return <Link key={project.id} to={`/projets/${project.id}`} className="flex items-center gap-4 rounded-xl p-3 hover:bg-slate-50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100"><BriefcaseBusiness className="h-5 w-5 text-slate-500" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{project.nom}</p><p className="truncate text-xs text-slate-400">{project.client?.nom ?? project.phase_label ?? project.phase.replaceAll('_', ' ')}</p></div>
                  <div className="hidden w-24 sm:block"><div className="mb-1 text-right text-[10px] text-slate-400">{completed}/{total} docs</div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} /></div></div>
                  <StatusBadge value={project.statut} />
                </Link>
              })}</div>}
          </div>)}</div>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold">A traiter</h2><p className="text-xs text-slate-400">Alertes et echeances prioritaires</p></div>
        <div className="space-y-3 p-4">
          {data.alerts.reminders.length === 0 && data.alerts.documents.length === 0
            ? <div className="py-8 text-center"><CircleCheck className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-2 text-sm font-medium">Aucune urgence</p></div>
            : <>
              {data.alerts.reminders.slice(0, 3).map((reminder) => <Link key={`r-${reminder.id}`} to="/relances" className="flex gap-3 rounded-xl bg-amber-50 p-3 hover:bg-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div className="min-w-0"><p className="truncate text-sm font-medium">{reminder.objet ?? 'Relance programmee'}</p><p className="truncate text-xs text-amber-700">{formatDate(reminder.scheduled_at) ? `Prevue le ${formatDate(reminder.scheduled_at)}` : reminder.destinataire_email}</p></div>
              </Link>)}
              {data.alerts.documents.slice(0, 3).map((document) => <Link key={`d-${document.id}`} to={`/projets/${document.projet_id}`} className="flex gap-3 rounded-xl bg-blue-50 p-3 hover:bg-blue-100">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><div className="min-w-0"><p className="truncate text-sm font-medium">{document.nom}</p><p className="truncate text-xs text-blue-700">{formatDate(document.due_at) ? `Echeance le ${formatDate(document.due_at)}` : document.workflow_status.replaceAll('_', ' ')}</p></div>
              </Link>)}
            </>}
        </div>
      </section>
    </div>
  </>
}

function DashboardLoading() {
  return <><PageHeader title="Bonjour" description="Chargement de vos priorites..." /><div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-slate-200" />)}</div><div className="mt-6 grid animate-pulse gap-6 xl:grid-cols-2"><div className="h-80 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div></>
}
