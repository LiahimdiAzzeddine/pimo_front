import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import AssistantOverview from '@/components/chantier/AssistantOverview'
import SuiviWorkspace from '@/components/chantier/SuiviWorkspace'
import type { PhaseDefinition, StepDefinition } from '@/components/chantier/workflow'
import PageHeader from '@/components/ui/PageHeader'
import api from '@/lib/api'
import type { AssistantItem, Projet, WorkloadBlock } from '@/types'

interface SuiviChantierResponse {
  projects: Projet[]
  counts: { total: number; by_phase: Record<string, number> }
  widgets: {
    urgent_documents: unknown[]; upcoming_documents: unknown[]; inactive_projects: Projet[]
    assistant_items: AssistantItem[]; time_minutes: number; workload: WorkloadBlock[]
  }
  generated_at: string
}

export default function Chantier() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useQuery({
    queryKey: ['suivi-chantier'],
    queryFn: async () => (await api.get<SuiviChantierResponse>('/suivi-chantier?limit=100')).data,
    staleTime: 30_000,
  })

  const setParam = (changes: Record<string, string | null>) => setSearchParams((current) => {
    const next = new URLSearchParams(current)
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    return next
  })

  if (query.isPending) return <><PageHeader title="Suivi chantier" description="Chargement de vos dossiers et de leurs étapes..." /><div className="grid animate-pulse gap-3 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-slate-200" />)}</div><div className="mt-5 h-[650px] animate-pulse rounded-2xl bg-slate-200" /></>
  if (query.isError) return <><PageHeader title="Suivi chantier" description="Pilotez vos dossiers, phases et étapes depuis une vue unique." /><div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-red-500" /><p className="mt-3 font-semibold text-red-950">Impossible de charger le suivi chantier.</p><button type="button" onClick={() => query.refetch()} className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"><RotateCw className="h-4 w-4" />Réessayer</button></div></>

  const projects = query.data.projects
  return <>
    <PageHeader title="Suivi chantier" description={`${projects.length} dossier${projects.length > 1 ? 's' : ''} actif${projects.length > 1 ? 's' : ''} · Vue phases, étapes et documents`} action={<button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"><RotateCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Mettre à jour</button>} />
    <AssistantOverview projects={projects} assistant={query.data.widgets} onChanged={() => query.refetch()} />
    <SuiviWorkspace
      projects={projects}
      phaseFilter={searchParams.get('filtre') ?? 'all'}
      selectedProjectId={Number(searchParams.get('projet')) || undefined}
      selectedPhaseValue={searchParams.get('phase') ?? undefined}
      selectedStepCode={searchParams.get('etape') ?? undefined}
      onPhaseFilterChange={(value) => setParam({ filtre: value === 'all' ? null : value, projet: null, phase: null, etape: null })}
      onProjectChange={(project) => setParam({ projet: String(project.id), phase: project.phase, etape: null })}
      onPhaseChange={(phase: PhaseDefinition) => setParam({ phase: phase.value, etape: phase.steps[0]?.code ?? null })}
      onStepChange={(step: StepDefinition) => setParam({ etape: step.code })}
      onChanged={() => query.refetch()}
    />
  </>
}
