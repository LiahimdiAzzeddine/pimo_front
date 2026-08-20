/**
 * Five-position progress indicator used across the Suivi Chantier screens
 * (annotations §7.1). The dot at `level` carries the tone; the rest stay muted.
 *
 * The exact colour rules ("feux tricolores") are still to be confirmed with the
 * client, so this renders the prototype's legend as closely as we can read it.
 */

export type StatusTone = 'neutre' | 'envoye' | 'relance' | 'recu' | 'retard'

const TONES: Record<StatusTone, string> = {
  neutre: 'bg-slate-300',
  envoye: 'bg-blue-500',
  relance: 'bg-amber-500',
  recu: 'bg-emerald-500',
  retard: 'bg-red-500',
}

const STATUS_LEGEND: { tone: StatusTone; label: string }[] = [
  { tone: 'envoye', label: 'Envoyé' },
  { tone: 'relance', label: 'Relancé' },
  { tone: 'recu', label: 'Reçu' },
  { tone: 'retard', label: 'En retard' },
  { tone: 'neutre', label: 'Inactif' },
]

export default function StatusDots({ level, tone = 'neutre', label }: { level: number; tone?: StatusTone; label?: string }) {
  return <div className="flex items-center gap-2">
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => <span
        key={index}
        className={`h-2.5 w-2.5 rounded-full ${index + 1 === level ? TONES[tone] : 'bg-slate-200'}`}
      />)}
    </div>
    {label && <span className="text-sm font-semibold text-slate-700">{label}</span>}
  </div>
}

export function StatusLegend() {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
    {STATUS_LEGEND.map(({ tone, label }) => <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className={`h-2 w-2 rounded-full ${TONES[tone]}`} />{label}
    </span>)}
  </div>
}
