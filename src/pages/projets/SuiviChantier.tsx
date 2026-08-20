import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Plus, RefreshCw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import ProjectFormModal, { type ProjectPayload } from '@/components/projects/ProjectFormModal'
import ContactsModal from '@/components/suivi/ContactsModal'
import DossierList from '@/components/suivi/DossierList'
import DossierPanel from '@/components/suivi/DossierPanel'
import EtapeDetail from '@/components/suivi/EtapeDetail'
import EtapeList, { type EtapeStatut } from '@/components/suivi/EtapeList'
import WidgetBar from '@/components/suivi/WidgetBar'
import { etapesForPhase, type EtapeDefinition } from '@/lib/etapes'
import { PHASES, phaseDefinition, phaseIndex, UNCLASSIFIED_THEME, type PhaseKey, type PriorityValue } from '@/lib/phases'
import type { Client, PaginatedResponse, Projet } from '@/types'

type PhaseFilter = PhaseKey | 'tous' | 'non_classe'

export default function SuiviChantier() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<PhaseFilter>('tous')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activePhase, setActivePhase] = useState<PhaseKey | null>(null)
  const [etapeKey, setEtapeKey] = useState<string | null>(null)
  const [statuts, setStatuts] = useState<Record<string, EtapeStatut>>({})
  const [priorities, setPriorities] = useState<Record<number, PriorityValue>>({})
  const [contactsOpen, setContactsOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const createRequested = searchParams.get('create') === '1'

  const projets = useQuery({
    queryKey: ['suivi-projets'],
    queryFn: async () => (await api.get<PaginatedResponse<Projet>>('/projets?limit=100')).data.data,
  })
  const clients = useQuery({
    queryKey: ['project-clients'],
    queryFn: async () => (await api.get<PaginatedResponse<Client>>('/clients?limit=200')).data.data,
  })
  const rows = useMemo(() => projets.data ?? [], [projets.data])
  const counts = useMemo(() => {
    const byPhase = Object.fromEntries(PHASES.map((phase) => [phase.key, 0])) as Record<PhaseKey, number>
    let unclassified = 0
    rows.forEach((projet) => {
      if (projet.phase && projet.phase in byPhase) byPhase[projet.phase as PhaseKey] += 1
      else unclassified += 1
    })
    return { byPhase, unclassified }
  }, [rows])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((projet) => {
      const matchesPhase = filter === 'tous'
        || (filter === 'non_classe' ? phaseIndex(projet.phase) === -1 : projet.phase === filter)
      const matchesTerm = !term || `${projet.nom} ${projet.adresse ?? ''} ${projet.client?.nom ?? ''}`.toLowerCase().includes(term)
      return matchesPhase && matchesTerm
    })
  }, [rows, filter, search])

  // Derived rather than stored: as filters narrow the list, the selection falls
  // back to the first visible dossier without an effect round-trip.
  const activeId = selectedId !== null && visible.some((projet) => projet.id === selectedId)
    ? selectedId
    : visible[0]?.id ?? null

  const dossier = useQuery({
    queryKey: ['suivi-dossier', activeId],
    enabled: activeId !== null,
    queryFn: async () => (await api.get<Projet>(`/projets/${activeId}`)).data,
  })

  const projet = dossier.data ?? null
  const phaseKey = activePhase ?? (phaseIndex(projet?.phase) > -1 ? (projet?.phase as PhaseKey) : PHASES[0].key)
  const phase = phaseDefinition(phaseKey) ?? PHASES[0]
  const etapes = etapesForPhase(phaseKey)
  const etape = etapes.find((item) => item.key === etapeKey) ?? null

  const advance = useMutation({
    mutationFn: async () => {
      const next = PHASES[phaseIndex(phaseKey) + 1]
      if (!projet || !next) return null
      return api.patch(`/projets/${projet.id}`, { phase: next.key })
    },
    onSuccess: () => {
      setNotice('')
      queryClient.invalidateQueries({ queryKey: ['suivi-projets'] })
      queryClient.invalidateQueries({ queryKey: ['suivi-dossier', activeId] })
      setActivePhase(null)
      setEtapeKey(null)
    },
    onError: (error) => setNotice(apiErrorMessage(error, 'Impossible de passer à la phase suivante.')),
  })

  const create = useMutation({
    mutationFn: (payload: ProjectPayload) => api.post('/projets', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suivi-projets'] })
      setSearchParams({}, { replace: true })
      setFormError('')
    },
    onError: (error) => setFormError(apiErrorMessage(error, 'Impossible de créer le dossier.')),
  })

  const selectPhase = (key: PhaseKey) => { setActivePhase(key); setEtapeKey(null) }
  const selectEtape = (item: EtapeDefinition) => setEtapeKey(item.key)
  const setStatut = (key: string, statut: EtapeStatut) => setStatuts((current) => ({ ...current, [key]: statut }))

  return <div className="flex flex-col gap-4">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Suivi Chantier — {user?.name ?? 'MOE'}</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">
          {rows.length} dossier(s) · {rows.filter((projet) => projet.statut === 'actif').length} actifs
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSearchParams({ create: '1' })}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />Nouveau dossier
        </button>
        <button
          type="button"
          onClick={() => projets.refetch()}
          disabled={projets.isFetching}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${projets.isFetching ? 'animate-spin' : ''}`} />Mettre à jour
        </button>
      </div>
    </header>

    <WidgetBar />

    <nav aria-label="Filtrer par phase" className="flex flex-wrap gap-2 rounded-xl bg-slate-100/80 p-2">
      <FilterChip label="Tous" count={rows.length} active={filter === 'tous'} onClick={() => setFilter('tous')} theme={{ chip: 'bg-white text-slate-500', chipActive: 'border border-slate-900 bg-white text-slate-900' }} />
      {PHASES.map((item) => <FilterChip
        key={item.key}
        label={item.filterLabel}
        count={counts.byPhase[item.key]}
        active={filter === item.key}
        onClick={() => setFilter(item.key)}
        theme={item.theme}
      />)}
      <FilterChip label="Non classé" count={counts.unclassified} active={filter === 'non_classe'} onClick={() => setFilter('non_classe')} theme={UNCLASSIFIED_THEME} />
    </nav>

    {notice && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">{notice}</p>}

    <div className="grid min-h-[640px] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[minmax(190px,0.9fr)_minmax(190px,0.9fr)_minmax(200px,1fr)_minmax(320px,2fr)] lg:divide-x lg:divide-slate-200">
      <DossierList
        projets={visible}
        selectedId={activeId}
        loading={projets.isLoading}
        search={search}
        onSearch={setSearch}
        onSelect={(item) => { setSelectedId(item.id); setActivePhase(null); setEtapeKey(null); setNotice('') }}
      />

      {projet
        ? <DossierPanel
            projet={projet}
            documents={projet.documents ?? []}
            documentsLoading={dossier.isLoading}
            activePhase={phaseKey}
            priority={priorities[projet.id] ?? 'normal'}
            onPriorityChange={(value) => setPriorities((current) => ({ ...current, [projet.id]: value }))}
            onPhaseSelect={selectPhase}
            onOpenContacts={() => setContactsOpen(true)}
            onArchive={() => setNotice('L\'archivage n\'est pas encore disponible : le champ correspondant n\'existe pas côté API.')}
          />
        : <Placeholder>Sélectionnez un dossier</Placeholder>}

      {projet
        ? <EtapeList
            phase={phase}
            etapes={etapes}
            statuts={statuts}
            selectedKey={etapeKey}
            onSelect={selectEtape}
            onValidatePhase={() => advance.mutate()}
            onSansSuite={() => setNotice('« Sans suite » n\'est pas encore disponible : le statut correspondant n\'existe pas côté API.')}
          />
        : <Placeholder>Aucune phase</Placeholder>}

      {projet && etape
        ? <EtapeDetail
            key={`${projet.id}-${etape.key}`}
            phase={phase}
            etape={etape}
            statut={statuts[etape.key] ?? 'a_faire'}
            documents={projet.documents ?? []}
            onStatutChange={(statut) => setStatut(etape.key, statut)}
            onConfirm={() => setStatut(etape.key, 'termine')}
          />
        : <Placeholder>Sélectionnez une étape</Placeholder>}
    </div>

    {projet && <p className="text-right text-[12px] text-slate-400">
      <Link to={`/projets/${projet.id}`} className="inline-flex items-center gap-1.5 hover:text-blue-600">
        <ExternalLink className="h-3.5 w-3.5" />Ouvrir la vue détaillée (checklist documentaire, liens publics)
      </Link>
    </p>}

    <ContactsModal open={contactsOpen} projet={projet} onClose={() => setContactsOpen(false)} />
    <ProjectFormModal
      open={createRequested}
      clients={clients.data ?? []}
      busy={create.isPending}
      error={formError}
      onSubmit={(payload) => create.mutate(payload)}
      onClose={() => { setSearchParams({}, { replace: true }); setFormError('') }}
    />
  </div>
}

function FilterChip({ label, count, active, onClick, theme }: { label: string; count: number; active: boolean; onClick: () => void; theme: { chip: string; chipActive: string } }) {
  return <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-lg px-3.5 py-2 text-[12px] font-bold uppercase tracking-wide transition ${active ? theme.chipActive : theme.chip}`}
  >
    {label} <span className="ml-1 font-semibold opacity-70">{count}</span>
  </button>
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <div className="hidden items-center justify-center p-6 lg:flex">
    <p className="text-center text-[13px] italic text-slate-400">{children}</p>
  </div>
}
