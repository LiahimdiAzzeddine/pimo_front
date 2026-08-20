import { Check, CircleDot, PauseCircle } from 'lucide-react'
import type { EtapeDefinition } from '@/lib/etapes'
import { PHASES, phaseIndex, type PhaseDefinition } from '@/lib/phases'

export type EtapeStatut = 'a_faire' | 'en_cours' | 'termine'

/** Column 3 — the steps of the selected phase (annotations §6). */
export default function EtapeList({ phase, etapes, statuts, selectedKey, onSelect, onValidatePhase, onSansSuite }: {
  phase: PhaseDefinition
  etapes: EtapeDefinition[]
  statuts: Record<string, EtapeStatut>
  selectedKey: string | null
  onSelect: (etape: EtapeDefinition) => void
  onValidatePhase: () => void
  onSansSuite: () => void
}) {
  const nextPhase = PHASES[phaseIndex(phase.key) + 1]

  return <div className="flex min-h-0 flex-col">
    <header className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-3">
      <span className={`h-4 w-1 rounded-full ${phase.theme.rule}`} />
      <h2 className={`text-[11px] font-bold uppercase tracking-[0.12em] ${phase.theme.text}`}>{phase.label}</h2>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto">
      {etapes.length === 0 && <p className="p-6 text-center text-[13px] text-slate-400">Aucune étape définie pour cette phase.</p>}
      {etapes.map((etape) => {
        const statut = statuts[etape.key] ?? 'a_faire'
        const selected = etape.key === selectedKey

        return <button
          key={etape.key}
          type="button"
          onClick={() => onSelect(etape)}
          aria-current={selected}
          className={`flex w-full items-start gap-2.5 border-b border-l-2 border-b-slate-100 px-3.5 py-3 text-left transition ${selected ? 'border-l-slate-900 bg-slate-50' : 'border-l-transparent hover:bg-slate-50/70'}`}
        >
          <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded ${statut === 'termine' ? 'bg-emerald-500 text-white' : statut === 'en_cours' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
            {statut === 'termine' && <Check className="h-3 w-3" />}
            {statut === 'en_cours' && <CircleDot className="h-3 w-3" />}
          </span>
          <span className={`text-[13px] leading-snug ${selected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{etape.label}</span>
        </button>
      })}
    </div>

    <footer className="space-y-2 border-t border-slate-100 px-3.5 py-3">
      <button
        type="button"
        onClick={onValidatePhase}
        disabled={!nextPhase}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
      >
        <Check className="h-3.5 w-3.5" />
        {nextPhase ? `Valider — Lancer ${nextPhase.label}` : 'Dernière phase'}
      </button>
      <button
        type="button"
        onClick={onSansSuite}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[12px] font-semibold text-orange-700 hover:bg-orange-100"
      >
        <PauseCircle className="h-3.5 w-3.5" />Sans suite
      </button>
    </footer>
  </div>
}
