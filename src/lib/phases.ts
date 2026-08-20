export type PhaseKey = 'etude_faisabilite' | 'consultation_entreprises' | 'analyse_offres' | 'chantier' | 'cloture'

export interface PhaseTheme {
  /** Filter chip when the phase is not the active filter. */
  chip: string
  /** Filter chip when the phase is the active filter. */
  chipActive: string
  /** Accent used for the phase title in columns 3 and 4. */
  text: string
  /** Left rule on the etape column header. */
  rule: string
  /** Short tag shown under the dossier name in column 1. */
  tag: string
}

export interface PhaseDefinition {
  key: PhaseKey
  /** Label used in the phase list of column 2 and the etape column header. */
  label: string
  /** Label used in the filter bar (rendered uppercase). */
  filterLabel: string
  /** Abbreviation shown under the dossier name in column 1. */
  abbreviation: string
  theme: PhaseTheme
}

/**
 * The five business phases, in order. Keys match `Projet::PHASES` on the API;
 * labels follow the "Suivi Chantier" prototype rather than the API's own
 * PHASE_LABELS, which are longer (e.g. "Dossier administratif / Consultation").
 */
export const PHASES: PhaseDefinition[] = [
  {
    key: 'etude_faisabilite',
    label: 'Faisabilité',
    filterLabel: 'Faisabilité',
    abbreviation: 'ESQ',
    theme: {
      chip: 'bg-blue-100/70 text-blue-400',
      chipActive: 'bg-blue-600 text-white',
      text: 'text-blue-600',
      rule: 'bg-blue-600',
      tag: 'text-blue-600',
    },
  },
  {
    key: 'consultation_entreprises',
    label: 'Dossier Admin',
    filterLabel: 'Dossier admin',
    abbreviation: 'DP · PC',
    theme: {
      chip: 'bg-emerald-100/70 text-emerald-500',
      chipActive: 'bg-emerald-600 text-white',
      text: 'text-emerald-600',
      rule: 'bg-emerald-600',
      tag: 'text-emerald-600',
    },
  },
  {
    key: 'analyse_offres',
    label: 'DCE / Offre',
    filterLabel: 'Offre finale',
    abbreviation: 'DCE',
    theme: {
      chip: 'bg-amber-100/70 text-amber-500',
      chipActive: 'bg-amber-500 text-white',
      text: 'text-amber-600',
      rule: 'bg-amber-500',
      tag: 'text-amber-600',
    },
  },
  {
    key: 'chantier',
    label: 'Chantier',
    filterLabel: 'Chantier',
    abbreviation: 'CHANTIER',
    theme: {
      chip: 'bg-orange-100/70 text-orange-500',
      chipActive: 'bg-orange-500 text-white',
      text: 'text-orange-600',
      rule: 'bg-orange-500',
      tag: 'text-orange-600',
    },
  },
  {
    key: 'cloture',
    label: 'Clôture',
    filterLabel: 'Clôture',
    abbreviation: 'CLÔTURE',
    theme: {
      chip: 'bg-red-100/70 text-red-400',
      chipActive: 'bg-red-500 text-white',
      text: 'text-red-600',
      rule: 'bg-red-500',
      tag: 'text-red-600',
    },
  },
]

export const UNCLASSIFIED_THEME: PhaseTheme = {
  chip: 'bg-slate-200/70 text-slate-400',
  chipActive: 'bg-slate-500 text-white',
  text: 'text-slate-500',
  rule: 'bg-slate-400',
  tag: 'text-slate-400',
}

export function phaseDefinition(phase?: string | null): PhaseDefinition | null {
  return PHASES.find((definition) => definition.key === phase) ?? null
}

export function phaseIndex(phase?: string | null): number {
  return PHASES.findIndex((definition) => definition.key === phase)
}

/** Priority tag on a dossier. Local-only for now — no API field backs it yet. */
export const PRIORITIES = [
  { value: 'normal', label: 'Normal', dot: 'bg-slate-400' },
  { value: 'sensible', label: 'Sensible', dot: 'bg-amber-500' },
  { value: 'critique', label: 'Critique', dot: 'bg-red-500' },
] as const

export type PriorityValue = (typeof PRIORITIES)[number]['value']

/** Days since the last update, as the prototype's "il y a Xj". */
export function daysSince(value?: string): number | null {
  if (!value) return null
  const elapsed = Date.now() - new Date(value).getTime()
  if (Number.isNaN(elapsed)) return null
  return Math.max(0, Math.floor(elapsed / 86_400_000))
}

export function stalenessClass(days: number | null): string {
  if (days === null) return 'text-slate-400'
  if (days <= 30) return 'text-emerald-600'
  if (days <= 180) return 'text-amber-600'
  return 'text-red-500'
}
