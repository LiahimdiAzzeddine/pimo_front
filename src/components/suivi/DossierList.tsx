import { FolderOpen, Search } from 'lucide-react'
import { daysSince, phaseDefinition, stalenessClass, UNCLASSIFIED_THEME } from '@/lib/phases'
import type { Projet } from '@/types'

/** Column 1 — the dossier list (annotations §1.3). */
export default function DossierList({ projets, selectedId, loading, search, onSearch, onSelect }: {
  projets: Projet[]
  selectedId: number | null
  loading: boolean
  search: string
  onSearch: (value: string) => void
  onSelect: (projet: Projet) => void
}) {
  return <div className="flex min-h-0 flex-col">
    <header className="border-b border-slate-100 px-3.5 py-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Plans / Dossiers</h2>
      <div className="relative mt-2.5">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Rechercher un dossier..."
          className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-[13px] outline-none focus:border-blue-400"
        />
      </div>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto">
      {loading && <p className="p-6 text-center text-sm text-slate-400">Chargement...</p>}
      {!loading && projets.length === 0 && <div className="p-8 text-center">
        <FolderOpen className="mx-auto h-7 w-7 text-slate-200" />
        <p className="mt-2 text-sm text-slate-400">Aucun dossier dans cette phase.</p>
      </div>}

      {projets.map((projet) => {
        const definition = phaseDefinition(projet.phase)
        const theme = definition?.theme ?? UNCLASSIFIED_THEME
        const days = daysSince(projet.updated_at)
        const selected = projet.id === selectedId

        return <button
          key={projet.id}
          type="button"
          onClick={() => onSelect(projet)}
          aria-current={selected}
          className={`flex w-full flex-col items-start border-b border-l-2 border-b-slate-100 px-3.5 py-3 text-left transition ${selected ? 'border-l-blue-600 bg-blue-50/60' : 'border-l-transparent hover:bg-slate-50'}`}
        >
          <span className="w-full truncate text-[13px] font-semibold text-slate-900">{projet.nom}</span>
          <span className={`mt-0.5 text-[11px] font-bold ${theme.tag}`}>{definition?.abbreviation ?? 'NON CLASSÉ'}</span>
          <span className={`text-[11px] ${stalenessClass(days)}`}>{days === null ? 'jamais mis à jour' : `il y a ${days}j`}</span>
        </button>
      })}
    </div>
  </div>
}
