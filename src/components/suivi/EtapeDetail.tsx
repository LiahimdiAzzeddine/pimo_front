import { useState } from 'react'
import { CheckCircle2, FileSignature, FolderSearch, Info, Plus, Save, SquarePen } from 'lucide-react'
import type { EtapeBloc, EtapeDefinition } from '@/lib/etapes'
import type { PhaseDefinition } from '@/lib/phases'
import StatusDots from '@/components/suivi/StatusDots'
import type { EtapeStatut } from '@/components/suivi/EtapeList'
import type { Document } from '@/types'

const STATUTS: { value: EtapeStatut; label: string; active: string }[] = [
  { value: 'a_faire', label: 'À faire', active: 'border-slate-300 bg-slate-100 text-slate-700' },
  { value: 'en_cours', label: 'En cours', active: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'termine', label: 'Terminé', active: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
]

const smallButton = 'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold'

/** Column 4 — detail of the selected step (annotations §6/§7). */
export default function EtapeDetail({ phase, etape, statut, documents, onStatutChange, onConfirm }: {
  phase: PhaseDefinition
  etape: EtapeDefinition
  statut: EtapeStatut
  documents: Document[]
  onStatutChange: (statut: EtapeStatut) => void
  onConfirm: () => void
}) {
  return <div className="flex min-h-0 flex-col">
    <header className="border-b border-slate-100 px-5 py-4">
      <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${phase.theme.text}`}>{phase.label}</p>
      <h2 className="mt-0.5 text-lg font-bold text-slate-900">{etape.label}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {STATUTS.map((item) => <button
          key={item.value}
          type="button"
          onClick={() => onStatutChange(item.value)}
          className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${statut === item.value ? item.active : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
        >
          {item.label}
        </button>)}
      </div>
    </header>

    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
      <p className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[13px] leading-relaxed text-slate-600">{etape.description}</p>
      {etape.blocs.map((bloc) => <Bloc key={bloc.key} bloc={bloc} phaseKey={phase.key} documents={documents} />)}
    </div>

    <footer className="border-t border-slate-100 px-5 py-3">
      <button type="button" onClick={onConfirm} className={`${smallButton} border-slate-300 text-slate-600 hover:bg-slate-50`}>
        <CheckCircle2 className="h-3.5 w-3.5" />Confirmer manuellement
      </button>
    </footer>
  </div>
}

function Bloc({ bloc, phaseKey, documents }: { bloc: EtapeBloc; phaseKey: string; documents: Document[] }) {
  return <section className="rounded-xl border border-slate-200 p-4">
    <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">{bloc.title}</h3>
    {bloc.kind === 'fields' && <FieldsBloc bloc={bloc} />}
    {bloc.kind === 'checklist' && <ChecklistBloc bloc={bloc} />}
    {bloc.kind === 'receipts' && <ReceiptsBloc bloc={bloc} />}
    {bloc.kind === 'documents' && <DocumentsBloc bloc={bloc} phaseKey={phaseKey} documents={documents} />}
    {bloc.kind === 'honoraires' && <HonorairesBloc />}
    {bloc.kind === 'validation' && <ValidationBloc />}
    {bloc.kind === 'outline' && <OutlineBloc bloc={bloc} />}
  </section>
}

function FieldsBloc({ bloc }: { bloc: EtapeBloc }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const inputClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-400'

  return <div className="space-y-3">
    {bloc.fields?.map((field) => <label key={field.key} className="block">
      <span className="mb-1 block text-[12px] font-medium text-slate-500">{field.label}</span>
      {field.type === 'textarea'
        ? <textarea
            rows={3}
            value={values[field.key] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
            className={inputClass}
          />
        : <input
            type={field.type}
            value={values[field.key] ?? ''}
            onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
            className={inputClass}
          />}
    </label>)}
    <button type="button" className={`${smallButton} border-slate-300 text-slate-600 hover:bg-slate-50`}><Save className="h-3.5 w-3.5" />Enregistrer</button>
  </div>
}

function ChecklistBloc({ bloc }: { bloc: EtapeBloc }) {
  const items = bloc.items ?? []
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const done = items.filter((item) => checked[item]).length

  return <div>
    <div className="mb-2.5 flex items-center justify-between">
      <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{bloc.counterLabel ?? 'Checklist'} — {done}/{items.length}</p>
      <p className="text-[11px] text-slate-400">{done}/{items.length} validés</p>
    </div>
    <div className="space-y-1">
      {items.map((item) => <label key={item} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50">
        <input
          type="checkbox"
          checked={checked[item] ?? false}
          onChange={(event) => setChecked({ ...checked, [item]: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
        />
        {item}
      </label>)}
    </div>
  </div>
}

function ReceiptsBloc({ bloc }: { bloc: EtapeBloc }) {
  const [audience, setAudience] = useState(bloc.audiences?.[0] ?? '')
  const [received, setReceived] = useState<Record<string, boolean>>({})

  return <div>
    {bloc.audiences && <div className="mb-3.5 flex gap-2">
      {bloc.audiences.map((item) => <button
        key={item}
        type="button"
        onClick={() => setAudience(item)}
        className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${audience === item ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
        {item}
      </button>)}
    </div>}
    <div className="space-y-1.5">
      {bloc.items?.map((item) => <div key={item} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${received[item] ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{item}</span>
        <button
          type="button"
          onClick={() => setReceived({ ...received, [item]: !received[item] })}
          className={`${smallButton} shrink-0 ${received[item] ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          {received[item] ? 'Reçu' : 'Marquer reçu'}
        </button>
      </div>)}
    </div>
  </div>
}

function DocumentsBloc({ bloc, phaseKey, documents }: { bloc: EtapeBloc; phaseKey: string; documents: Document[] }) {
  const matching = documents.filter((document) => document.phase === phaseKey
    && (!bloc.documentTypes || bloc.documentTypes.includes(document.type_document)))
  const [selected, setSelected] = useState<Record<number, boolean>>({})

  return <div>
    {matching.length === 0
      ? <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-[12px] italic text-slate-400">{bloc.emptyHint ?? 'Aucun fichier détecté.'}</p>
      : <div className="space-y-1">
          {matching.map((document) => <div key={document.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={selected[document.id] ?? false}
              onChange={(event) => setSelected({ ...selected, [document.id]: event.target.checked })}
              className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700" title={document.nom}>{document.original_file_name ?? document.nom}</span>
            {document.due_at && <span className="shrink-0 text-[11px] text-slate-400">{new Date(document.due_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
            <button type="button" aria-label={`Ouvrir ${document.nom}`} className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"><SquarePen className="h-3.5 w-3.5" /></button>
          </div>)}
        </div>}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={`${smallButton} border-slate-200 text-slate-500 hover:bg-slate-50`}><Plus className="h-3.5 w-3.5" />Ajouter manuellement</button>
      <button type="button" className={`${smallButton} border-slate-200 text-slate-500 hover:bg-slate-50`}><FolderSearch className="h-3.5 w-3.5" />Parcourir</button>
      <button type="button" className={`${smallButton} border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}><CheckCircle2 className="h-3.5 w-3.5" />Valider la sélection</button>
    </div>
  </div>
}

/** Reusable "statut honoraires de phase" component (annotations §7.2). */
function HonorairesBloc() {
  const options = [
    { value: 'envoye', label: 'Envoyé', level: 3, tone: 'relance' as const, active: 'border-amber-300 bg-amber-50 text-amber-700' },
    { value: 'valide', label: 'Validé client', level: 4, tone: 'recu' as const, active: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
    { value: 'litige', label: 'En litige', level: 5, tone: 'retard' as const, active: 'border-red-300 bg-red-50 text-red-700' },
  ]
  const [value, setValue] = useState<string | null>(null)
  const current = options.find((option) => option.value === value)

  return <div>
    <StatusDots level={current?.level ?? 0} tone={current?.tone ?? 'neutre'} label={current?.label ?? 'Non envoyé'} />
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => <button
        key={option.value}
        type="button"
        onClick={() => setValue(value === option.value ? null : option.value)}
        className={`${smallButton} ${value === option.value ? option.active : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
        {option.label}
      </button>)}
    </div>
    <p className="mt-3 text-[12px] italic text-slate-400">Aucun devis rattaché à cette phase pour le moment.</p>
    <button type="button" className={`${smallButton} mt-2 border-slate-200 text-slate-500 hover:bg-slate-50`}><FolderSearch className="h-3.5 w-3.5" />Sélectionner manuellement</button>
  </div>
}

function ValidationBloc() {
  const [mode, setMode] = useState<'verbal' | 'signe' | null>(null)

  return <div>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setMode(mode === 'verbal' ? null : 'verbal')}
        className={`${smallButton} ${mode === 'verbal' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />Accord verbal
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'signe' ? null : 'signe')}
        className={`${smallButton} ${mode === 'signe' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
        <FileSignature className="h-3.5 w-3.5" />Sélectionner fichier signé
      </button>
    </div>
    <p className="mt-3 text-[12px] italic text-slate-400">Lettre de mission ou contrat CCAG non détecté.</p>
  </div>
}

/**
 * Screens whose backend exists but whose UI is not built yet. Rendering the
 * real structure keeps the review honest about what is and is not wired.
 */
function OutlineBloc({ bloc }: { bloc: EtapeBloc }) {
  return <div className="space-y-2.5">
    {bloc.sections?.map((section) => <div key={section.title} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
      <p className="text-[12px] font-semibold text-slate-700">{section.title}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{section.detail}</p>
    </div>)}
    <p className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-blue-800">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Écran à construire.
        {bloc.backing ? <> L'API existe déjà : <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-[10px]">{bloc.backing}</code></> : ' Aucune API correspondante pour le moment.'}
      </span>
    </p>
  </div>
}
