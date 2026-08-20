import { useMemo, useState } from 'react'
import { Archive, Check, ChevronDown, CircleDot, FileText, Folder, FolderOpen, Users } from 'lucide-react'
import { PHASES, PRIORITIES, phaseIndex, type PhaseKey, type PriorityValue } from '@/lib/phases'
import type { Document, Projet } from '@/types'

type Tab = 'documents' | 'actions'

/** Column 2 — the selected dossier: priority, contacts, documents tree, phases. */
export default function DossierPanel({ projet, documents, documentsLoading, activePhase, priority, onPriorityChange, onPhaseSelect, onOpenContacts, onArchive }: {
  projet: Projet
  documents: Document[]
  documentsLoading: boolean
  activePhase: PhaseKey
  priority: PriorityValue
  onPriorityChange: (value: PriorityValue) => void
  onPhaseSelect: (phase: PhaseKey) => void
  onOpenContacts: () => void
  onArchive: () => void
}) {
  const [tab, setTab] = useState<Tab>('actions')
  const currentIndex = phaseIndex(projet.phase)

  return <div className="flex min-h-0 flex-col">
    <header className="border-b border-slate-100 px-3.5 py-3">
      <h2 className="truncate text-[15px] font-bold text-slate-900" title={projet.nom}>{projet.nom}</h2>
      <div className="mt-2.5 flex items-center gap-2">
        <PrioritySelect value={priority} onChange={onPriorityChange} />
        <button
          type="button"
          onClick={onOpenContacts}
          title="Contacts du dossier"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600"
        >
          <Users className="h-4 w-4" />
        </button>
      </div>
    </header>

    <div className="grid grid-cols-2 gap-2 px-3.5 py-3">
      {([['documents', 'Documents', Folder], ['actions', 'Actions', CircleDot]] as const).map(([key, label, Icon]) => <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[12px] font-medium transition ${tab === key ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
        <Icon className="h-4 w-4" />{label}
      </button>)}
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3">
      {tab === 'actions'
        ? <PhaseList activePhase={activePhase} currentIndex={currentIndex} onSelect={onPhaseSelect} />
        : <DocumentTree documents={documents} loading={documentsLoading} />}
    </div>

    <footer className="border-t border-slate-100 px-3.5 py-3">
      <button
        type="button"
        onClick={onArchive}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      >
        <Archive className="h-4 w-4" />Archiver ce dossier
      </button>
    </footer>
  </div>
}

function PrioritySelect({ value, onChange }: { value: PriorityValue; onChange: (value: PriorityValue) => void }) {
  const active = PRIORITIES.find((item) => item.value === value) ?? PRIORITIES[0]

  return <div className="relative flex-1">
    <span className={`pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${active.dot}`} />
    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    <select
      aria-label="Priorité du dossier"
      value={value}
      onChange={(event) => onChange(event.target.value as PriorityValue)}
      className="w-full appearance-none rounded-lg border border-slate-200 py-1.5 pl-6 pr-7 text-[12px] font-medium text-slate-600 outline-none focus:border-blue-400"
    >
      {PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </div>
}

function PhaseList({ activePhase, currentIndex, onSelect }: { activePhase: PhaseKey; currentIndex: number; onSelect: (phase: PhaseKey) => void }) {
  return <div className="space-y-0.5">
    {PHASES.map((phase, index) => {
      const done = currentIndex > -1 && index < currentIndex
      const current = index === currentIndex
      const active = phase.key === activePhase

      return <button
        key={phase.key}
        type="button"
        onClick={() => onSelect(phase.key)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${active ? 'bg-slate-100 font-semibold text-slate-900' : 'hover:bg-slate-50'}`}
      >
        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded ${done ? 'bg-emerald-500 text-white' : current ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
          {done && <Check className="h-3 w-3" />}
          {current && <CircleDot className="h-3 w-3" />}
        </span>
        <span className={done || current || active ? 'text-slate-800' : 'text-slate-400'}>{phase.label}</span>
      </button>
    })}
  </div>
}

/**
 * Documents grouped phase → type (annotations §3). The API has no folder
 * hierarchy, so this derives the tree from `phase` and `type_document`.
 */
function DocumentTree({ documents, loading }: { documents: Document[]; loading: boolean }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const byPhase = new Map<string, Map<string, Document[]>>()
    documents.forEach((document) => {
      const phase = document.phase ?? 'sans_phase'
      const type = document.type_document ?? 'autre'
      if (!byPhase.has(phase)) byPhase.set(phase, new Map())
      const byType = byPhase.get(phase)!
      byType.set(type, [...(byType.get(type) ?? []), document])
    })
    const ordered: { key: string; label: string; types: Map<string, Document[]> }[] = []
    PHASES.forEach((phase) => {
      const types = byPhase.get(phase.key)
      if (types) ordered.push({ key: phase.key, label: phase.label, types })
    })
    const orphans = byPhase.get('sans_phase')
    if (orphans) ordered.push({ key: 'sans_phase', label: 'Sans phase', types: orphans })
    return ordered
  }, [documents])

  if (loading) return <p className="py-6 text-center text-[13px] text-slate-400">Chargement des documents...</p>
  if (groups.length === 0) return <p className="py-6 text-center text-[13px] text-slate-400">Aucun document sur ce dossier.</p>

  return <div className="space-y-1">
    {groups.map((group) => {
      const open = !collapsed[group.key]
      const count = [...group.types.values()].reduce((total, items) => total + items.length, 0)

      return <div key={group.key}>
        <button
          type="button"
          onClick={() => setCollapsed((current) => ({ ...current, [group.key]: open }))}
          className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
          <span className="truncate">{group.label}</span>
          <span className="ml-auto text-[10px] font-normal text-slate-400">{count}</span>
        </button>
        {open && <div className="ml-2 border-l border-slate-100 pl-2">
          {[...group.types.entries()].map(([type, items]) => <div key={type} className="mt-0.5">
            <p className="px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{type.replaceAll('_', ' ')} ({items.length})</p>
            {items.map((document) => <div key={document.id} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px] text-slate-600 hover:bg-slate-50" title={document.nom}>
              <FileText className={`h-3.5 w-3.5 shrink-0 ${document.file_path ? 'text-blue-500' : 'text-slate-300'}`} />
              <span className="truncate">{document.original_file_name ?? document.nom}</span>
            </div>)}
          </div>)}
        </div>}
      </div>
    })}
  </div>
}
