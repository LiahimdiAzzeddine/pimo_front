import { useState } from 'react'
import { Building2, CalendarDays, Check, CheckCircle2, Euro, FileCheck2, FileText, FolderOpen, Mail, MessageSquareText, Pencil, Plus, Printer, RotateCcw, Save, Scale, Send, Trash2, Upload, UserPlus, Users, X } from 'lucide-react'
import api from '@/lib/api'
import type { Devis, Document, ProjectStep, Projet } from '@/types'

type StepStatus = ProjectStep['status']
type StepData = Record<string, unknown>
type SavePayload = { status: StepStatus; notes?: string; data?: StepData }

interface Props {
  project: Projet
  stepCode: string
  trackingStep?: ProjectStep
  onSave: (payload: SavePayload) => Promise<unknown> | void
  onChanged: () => Promise<unknown> | void
}

const completeStatuses = ['valide', 'signe', 'archive']
const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const activeStatus = (step?: ProjectStep): StepStatus => step?.status === 'terminee' || step?.status === 'sans_objet' ? step.status : 'en_cours'
const value = (data: StepData | undefined, key: string) => typeof data?.[key] === 'string' ? data[key] as string : ''

type FeasibilityCheckStatus = 'a_verifier' | 'conforme' | 'reserves' | 'non_applicable'
type FeasibilityCheck = { id: string; label: string; status: FeasibilityCheckStatus }
type ConsultationStatus = 'envoye' | 'relance' | 'recu' | 'retard' | 'inactif'
type ConsultationMember = { id: string; quoteId?: number; lotId?: number; partnerId?: number; name: string; email: string; phone?: string; lot: string }
type ConsultationTeam = { id: string; name: string; members: ConsultationMember[] }

const dataArray = <T,>(data: StepData | undefined, key: string): T[] => Array.isArray(data?.[key]) ? data[key] as T[] : []
const consultationStepData = (project: Projet): StepData | undefined => project.tracking_phases
  ?.flatMap((phase) => phase.steps ?? [])
  .find((step) => step.definition.code.replaceAll('_', '-') === 'consultation-artisans')?.data

const STANDARD_FEASIBILITY_CHECKS: FeasibilityCheck[] = [
  { id: 'site_visit', label: 'Visite et relevé du site réalisés', status: 'a_verifier' },
  { id: 'urban_planning', label: 'Contraintes PLU, urbanisme et servitudes vérifiées', status: 'a_verifier' },
  { id: 'geotechnical', label: 'Contraintes géotechniques et risques naturels vérifiés', status: 'a_verifier' },
  { id: 'networks', label: 'Réseaux vérifiés (eau, électricité, assainissement)', status: 'a_verifier' },
  { id: 'accessibility', label: 'Accessibilité, PMR et sécurité vérifiées', status: 'a_verifier' },
  { id: 'budget', label: 'Budget compatible avec le programme', status: 'a_verifier' },
  { id: 'schedule', label: 'Délais compatibles avec les attentes du client', status: 'a_verifier' },
]

const freshStandardChecks = () => STANDARD_FEASIBILITY_CHECKS.map((item) => ({ ...item }))

function initialFeasibilityChecks(data?: StepData): FeasibilityCheck[] {
  if (Array.isArray(data?.feasibility_checks)) {
    const statuses: FeasibilityCheckStatus[] = ['a_verifier', 'conforme', 'reserves', 'non_applicable']
    const saved = data.feasibility_checks.flatMap((item, index) => {
      if (!item || typeof item !== 'object') return []
      const row = item as Record<string, unknown>
      const label = String(row.label ?? '').trim()
      if (!label) return []
      const status = statuses.includes(row.status as FeasibilityCheckStatus) ? row.status as FeasibilityCheckStatus : 'a_verifier'
      return [{ id: String(row.id ?? `check-${index}`), label, status }]
    })
    if (saved.length) return saved
  }

  const checks = freshStandardChecks().map((item) => {
    const legacyKey = item.id === 'urban_planning' ? 'urban_rules' : item.id === 'budget' ? 'budget_compatible' : item.id
    return { ...item, status: data?.[legacyKey] === true ? 'conforme' as const : item.status }
  })
  if (data?.technical_constraints === true) checks.push({ id: 'legacy-technical', label: 'Contraintes techniques générales analysées', status: 'conforme' })
  return checks
}

export default function FaisabiliteDetail(props: Props) {
  if (props.stepCode === 'rdv-analyse') return <InitialMeeting {...props} />
  if (props.stepCode === 'analyse-faisabilite') return <FeasibilityAnalysis {...props} />
  if (props.stepCode === 'devis-validation') return <QuoteValidation {...props} />
  if (props.stepCode === 'esquisse-notice') return <SketchNotice {...props} />
  if (props.stepCode === 'consultation-artisans') return <ArtisanConsultation {...props} />
  return <OfferComparison {...props} />
}

function InitialMeeting({ project, trackingStep, onSave }: Props) {
  const initial = trackingStep?.data
  const [form, setForm] = useState({
    appointment_at: value(initial, 'appointment_at'),
    location: value(initial, 'location'),
    program: value(initial, 'program') || project.description || '',
    objectives: value(initial, 'objectives'),
  })
  const update = (key: keyof typeof form, next: string) => setForm((current) => ({ ...current, [key]: next }))

  return <div className="mt-5 grid gap-4 2xl:grid-cols-2">
    <Section title="Rendez-vous initial" icon={CalendarDays}>
      <Field label="Date et heure"><input type="datetime-local" value={form.appointment_at} onChange={(event) => update('appointment_at', event.target.value)} className={fieldClass} /></Field>
      <Field label="Lieu / visioconférence"><input value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Adresse ou lien" className={fieldClass} /></Field>
      <Info label="Client" value={project.client ? `${project.client.prenom ?? ''} ${project.client.nom}`.trim() : 'Non rattaché'} />
    </Section>
    <Section title="Programme client" icon={Users}>
      <Field label="Programme et besoins"><textarea rows={5} value={form.program} onChange={(event) => update('program', event.target.value)} placeholder="Décrire les travaux et les attentes du client" className={fieldClass} /></Field>
      <Field label="Objectifs / décisions du rendez-vous"><textarea rows={3} value={form.objectives} onChange={(event) => update('objectives', event.target.value)} className={fieldClass} /></Field>
      <SaveButton onClick={() => onSave({ status: activeStatus(trackingStep), data: form })} />
    </Section>
  </div>
}

function FeasibilityAnalysis({ trackingStep, onSave }: Props) {
  const initial = trackingStep?.data
  const [checks, setChecks] = useState<FeasibilityCheck[]>(() => initialFeasibilityChecks(initial))
  const [conclusion, setConclusion] = useState(value(initial, 'conclusion'))
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string>()
  const [editingLabel, setEditingLabel] = useState('')
  const applicable = checks.filter((item) => item.status !== 'non_applicable')
  const completed = applicable.filter((item) => item.status === 'conforme' || item.status === 'reserves').length
  const progress = applicable.length ? Math.round(completed / applicable.length * 100) : 100
  const statusOptions: Array<{ value: FeasibilityCheckStatus; label: string }> = [
    { value: 'a_verifier', label: 'À vérifier' },
    { value: 'conforme', label: 'Conforme' },
    { value: 'reserves', label: 'Avec réserves' },
    { value: 'non_applicable', label: 'Non applicable' },
  ]

  const updateStatus = (id: string, status: FeasibilityCheckStatus) => setChecks((current) => current.map((item) => item.id === id ? { ...item, status } : item))
  const addCheck = () => {
    const label = newLabel.trim()
    if (!label) return
    setChecks((current) => [...current, { id: crypto.randomUUID(), label, status: 'a_verifier' }])
    setNewLabel('')
  }
  const startEditing = (item: FeasibilityCheck) => { setEditingId(item.id); setEditingLabel(item.label) }
  const saveLabel = () => {
    const label = editingLabel.trim()
    if (label && editingId) setChecks((current) => current.map((item) => item.id === editingId ? { ...item, label } : item))
    setEditingId(undefined); setEditingLabel('')
  }
  const restoreStandard = () => {
    if (window.confirm('Remplacer la liste actuelle par la checklist standard ?')) {
      setChecks(freshStandardChecks()); setEditingId(undefined); setNewLabel('')
    }
  }

  return <div className="mt-5">
    <Section title={`Checklist d’analyse · ${completed}/${applicable.length}`} icon={FileCheck2}>
      <div className="mb-4 rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Avancement des contrôles applicables</span><span className="font-bold text-blue-700">{progress} %</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div></div>
      <div className="space-y-2">{checks.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          {editingId === item.id ? <><input autoFocus value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveLabel(); if (event.key === 'Escape') setEditingId(undefined) }} className="min-w-52 flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" /><button type="button" onClick={saveLabel} className="rounded-lg bg-blue-600 p-2 text-white" title="Enregistrer le libellé"><Check className="h-4 w-4" /></button><button type="button" onClick={() => setEditingId(undefined)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Annuler"><X className="h-4 w-4" /></button></> : <><p className="min-w-52 flex-1 text-sm font-medium text-slate-700">{item.label}</p><select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value as FeasibilityCheckStatus)} className={`rounded-lg border px-2.5 py-2 text-xs font-semibold outline-none ${item.status === 'conforme' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : item.status === 'reserves' ? 'border-amber-200 bg-amber-50 text-amber-700' : item.status === 'non_applicable' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" onClick={() => startEditing(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Modifier"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => setChecks((current) => current.filter((check) => check.id !== item.id))} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button></>}
        </div>
      </article>)}</div>
      {!checks.length && <Empty text="Aucun contrôle. Ajoutez un élément ou restaurez la liste standard." />}
      <div className="mt-4 flex gap-2"><input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCheck() } }} placeholder="Nouveau contrôle personnalisé" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" /><button type="button" disabled={!newLabel.trim()} onClick={addCheck} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Ajouter</button></div>
      <button type="button" onClick={restoreStandard} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700"><RotateCcw className="h-3.5 w-3.5" />Restaurer la checklist standard</button>
      <Field label="Conclusion de faisabilité"><textarea rows={4} value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="Faisable, réserves éventuelles et prochaines décisions" className={fieldClass} /></Field>
      <SaveButton onClick={() => onSave({ status: activeStatus(trackingStep), data: { feasibility_checks: checks, conclusion } })} />
    </Section>
  </div>
}

function QuoteValidation({ project, trackingStep, onSave, onChanged }: Props) {
  const quotes = (project.devis ?? []).filter((quote) => quote.type === 'mo' && quote.phase === 'etude_faisabilite')
  const quoteDocuments = (project.documents ?? []).filter((document) => document.type_document === 'devis' && (!document.phase || document.phase === 'etude_faisabilite'))
  const signedDocuments = (project.documents ?? []).filter((document) => document.type_document === 'contrat' && (!document.phase || document.phase === 'etude_faisabilite'))
  const initial = trackingStep?.data
  const [approval, setApproval] = useState<'none' | 'verbal' | 'signed'>(() => {
    const saved = value(initial, 'client_approval')
    return saved === 'verbal' || saved === 'signed' ? saved : signedDocuments.length ? 'signed' : 'none'
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const mainQuote = quotes[0]
  const quoteStatus = mainQuote?.statut ?? 'en_attente'
  const canConfirm = Boolean(mainQuote && (quoteStatus === 'valide' || approval !== 'none' || signedDocuments.length))

  const uploadQuote = async (file?: File) => {
    if (!file) return
    setBusy(true); setMessage('')
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('projet_id', String(project.id))
      data.append('phase', 'etude_faisabilite')
      data.append('type_document', 'devis')
      data.append('nom', `Devis honoraires MOE - ${file.name}`)
      const response = await api.post<{ document: Document }>('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (mainQuote) await api.patch(`/devis/${mainQuote.id}`, { document_id: response.data.document.id })
      else await api.post('/devis', { projet_id: project.id, document_id: response.data.document.id, type: 'mo', partenaire_nom: 'Honoraires MOE', statut: 'en_attente', phase: 'etude_faisabilite' })
      await onChanged()
    } catch { setMessage('Impossible d’ajouter le devis PDF.') } finally { setBusy(false) }
  }

  const updateQuote = async (quote: Devis, status: string) => {
    setBusy(true); setMessage('')
    try { await api.patch(`/devis/${quote.id}`, { statut: status }); await onChanged() } catch { setMessage('Impossible de modifier l’état du devis.') } finally { setBusy(false) }
  }

  const recordApproval = async (next: 'verbal' | 'signed', documentId?: number) => {
    setApproval(next)
    await Promise.resolve(onSave({ status: 'en_cours', data: { ...(initial ?? {}), client_approval: next, client_approval_at: new Date().toISOString(), ...(documentId ? { validation_document_id: documentId } : {}) } }))
  }

  const uploadSignedAgreement = async (file?: File) => {
    if (!file) return
    setBusy(true); setMessage('')
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('projet_id', String(project.id))
      data.append('phase', 'etude_faisabilite')
      data.append('type_document', 'contrat')
      data.append('nom', `Accord client signé - ${file.name}`)
      const response = await api.post<{ document: Document }>('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      await recordApproval('signed', response.data.document.id)
      await onChanged()
    } catch { setMessage('Impossible d’ajouter le document signé.') } finally { setBusy(false) }
  }

  const confirm = async () => {
    if (!mainQuote || !canConfirm) return
    setBusy(true); setMessage('')
    try {
      if (mainQuote.statut !== 'valide') await api.patch(`/devis/${mainQuote.id}`, { statut: 'valide' })
      await Promise.resolve(onSave({ status: 'terminee', data: { ...(initial ?? {}), client_approval: approval === 'none' ? 'verbal' : approval, confirmed_at: new Date().toISOString() } }))
      await onChanged()
    } catch { setMessage('Impossible de confirmer cette étape.') } finally { setBusy(false) }
  }

  const states = [
    { value: 'en_attente', label: 'Non envoyé', color: 'border-slate-200 bg-slate-50 text-slate-600', dot: 'bg-slate-300' },
    { value: 'recu', label: 'Envoyé', color: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
    { value: 'valide', label: 'Validé client', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    { value: 'refuse', label: 'En litige', color: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  ]

  return <div className="mt-5">
    <Section title="Devis honoraires MOE + accord client" icon={Euro}>
      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">A — Devis honoraires MOE</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {states.map((state) => <button key={state.value} type="button" disabled={busy || !mainQuote} onClick={() => mainQuote && void updateQuote(mainQuote, state.value)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${state.color} ${mainQuote && quoteStatus === state.value ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}><span className={`h-2.5 w-2.5 rounded-full ${state.dot}`} />{state.label}</button>)}
        </div>
        <div className="mt-4 space-y-2">{quoteDocuments.length ? quoteDocuments.map((document) => <DocumentItem key={document.id} document={document} />) : <Empty text="Aucun devis honoraires MOE sélectionné." />}</div>
        <label className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />{quoteDocuments.length ? 'Remplacer / ajouter un devis PDF' : 'Sélectionner manuellement le devis PDF'}<input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => { void uploadQuote(event.target.files?.[0]); event.target.value = '' }} /></label>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">B — Validation client</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy || !mainQuote} onClick={() => void recordApproval('verbal')} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold disabled:opacity-45 ${approval === 'verbal' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><MessageSquareText className="h-4 w-4" />Accord verbal</button>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold ${approval === 'signed' || signedDocuments.length ? 'border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} ${busy || !mainQuote ? 'pointer-events-none opacity-45' : ''}`}><FileCheck2 className="h-4 w-4" />Sélectionner le fichier signé<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => { void uploadSignedAgreement(event.target.files?.[0]); event.target.value = '' }} /></label>
        </div>
        <div className="mt-3 space-y-2">{signedDocuments.map((document) => <DocumentItem key={document.id} document={document} />)}{approval === 'verbal' && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Accord verbal enregistré sur cet appareil.</p>}{approval === 'none' && !signedDocuments.length && <p className="text-xs italic text-slate-400">Aucun accord client enregistré.</p>}</div>
      </div>

      <ActionMessage text={message} />
      <button type="button" disabled={busy || !canConfirm} onClick={() => void confirm()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"><CheckCircle2 className="h-4 w-4" />Confirmer manuellement</button>
      {!mainQuote && <p className="mt-2 text-xs text-amber-700">Sélectionnez d’abord le devis PDF.</p>}
      {mainQuote && !canConfirm && <p className="mt-2 text-xs text-amber-700">Enregistrez l’accord verbal ou ajoutez le fichier signé pour terminer l’étape.</p>}
    </Section>
  </div>
}

function SketchNotice({ project, trackingStep, onSave, onChanged }: Props) {
  const initial = trackingStep?.data
  const allDocuments = project.documents ?? []
  const [esquisseIds, setEsquisseIds] = useState<number[]>(() => {
    const saved = dataArray<number>(initial, 'esquisse_document_ids')
    return saved.length ? saved : allDocuments.filter((document) => document.type_document === 'plan' || /esq|esquisse|aps|avant-projet/i.test(document.nom)).map((document) => document.id)
  })
  const [noticeIds, setNoticeIds] = useState<number[]>(() => {
    const saved = dataArray<number>(initial, 'notice_document_ids')
    return saved.length ? saved : allDocuments.filter((document) => /notice|descriptif|programme|cahier/i.test(document.nom)).map((document) => document.id)
  })
  const [browser, setBrowser] = useState<'esquisse' | 'notice'>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const toggle = (target: 'esquisse' | 'notice', id: number) => {
    const setter = target === 'esquisse' ? setEsquisseIds : setNoticeIds
    setter((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }
  const upload = async (target: 'esquisse' | 'notice', file?: File) => {
    if (!file) return
    setBusy(true); setMessage('')
    const data = new FormData()
    data.append('file', file); data.append('projet_id', String(project.id)); data.append('phase', 'etude_faisabilite'); data.append('type_document', target === 'esquisse' ? 'plan' : 'autre'); data.append('nom', target === 'esquisse' ? `Esquisse - ${file.name}` : `Notice descriptive - ${file.name}`)
    try {
      const response = await api.post<{ document: Document }>('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (target === 'esquisse') setEsquisseIds((current) => [...current, response.data.document.id])
      else setNoticeIds((current) => [...current, response.data.document.id])
      await onChanged()
    } catch { setMessage('Échec du dépôt. Formats acceptés : PDF, JPEG ou PNG.') } finally { setBusy(false) }
  }
  const selectedDocuments = (ids: number[]) => allDocuments.filter((document) => ids.includes(document.id))
  const selector = (target: 'esquisse' | 'notice', ids: number[]) => <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
    <div className="space-y-2">{selectedDocuments(ids).map((document) => <div key={document.id} className="flex items-center gap-2 rounded-lg bg-white p-2"><Check className="h-4 w-4 text-emerald-500" /><span className="min-w-0 flex-1 truncate text-xs font-medium">{document.nom}</span><button type="button" onClick={() => toggle(target, document.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><X className="h-3.5 w-3.5" /></button></div>)}{!ids.length && <p className="text-xs italic text-slate-400">Aucun fichier sélectionné.</p>}</div>
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setBrowser(browser === target ? undefined : target)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><FolderOpen className="h-4 w-4" />Parcourir le dossier</button><label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />Ajouter manuellement<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { void upload(target, event.target.files?.[0]); event.target.value = '' }} /></label></div>
    {browser === target && <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">{allDocuments.map((document) => <label key={document.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"><input type="checkbox" checked={ids.includes(document.id)} onChange={() => toggle(target, document.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600" /><FileText className="h-4 w-4 text-blue-500" /><span className="min-w-0 flex-1 truncate text-xs">{document.nom}</span></label>)}{!allDocuments.length && <Empty text="Aucun document dans ce projet." />}</div>}
  </div>
  return <div className="mt-5 space-y-4">
    <Section title="A — Esquisse / Documents ESQ" icon={FileText}>{selector('esquisse', esquisseIds)}</Section>
    <Section title="B — Notice descriptive" icon={FileCheck2}>{selector('notice', noticeIds)}</Section>
    <ActionMessage text={message} />
    <SaveButton label="Valider les sélections" onClick={() => onSave({ status: activeStatus(trackingStep), data: { ...(initial ?? {}), esquisse_document_ids: esquisseIds, notice_document_ids: noticeIds } })} />
  </div>
}

function ArtisanConsultation({ project, trackingStep, onSave, onChanged }: Props) {
  const initial = trackingStep?.data
  const quotes = (project.devis ?? []).filter((quote) => quote.type === 'artisan' && quote.phase === 'etude_faisabilite')
  const availableDocuments = (project.documents ?? []).filter((document) => document.phase === 'etude_faisabilite' || /esq|esquisse|notice|descriptif|dce/i.test(document.nom))
  const [documentIds, setDocumentIds] = useState<number[]>(() => {
    const saved = dataArray<number>(initial, 'consultation_document_ids')
    return saved.length ? saved : availableDocuments.map((document) => document.id)
  })
  const [teams, setTeams] = useState<ConsultationTeam[]>(() => {
    const saved = dataArray<ConsultationTeam>(initial, 'consultation_teams')
    return saved.length ? saved : [{ id: crypto.randomUUID(), name: 'Équipe 1', members: [] }]
  })
  const [deadline, setDeadline] = useState(value(initial, 'consultation_deadline'))
  const [followup, setFollowup] = useState<Record<string, ConsultationStatus>>(() => initial?.consultation_followup && typeof initial.consultation_followup === 'object' ? initial.consultation_followup as Record<string, ConsultationStatus> : {})
  const [form, setForm] = useState({ teamId: teams[0]?.id ?? '', partnerId: '', name: '', email: '', phone: '', lot: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const members = teams.flatMap((team) => team.members)

  const saveWorkflow = async (nextTeams = teams, extra: StepData = {}) => {
    await Promise.resolve(onSave({ status: 'en_cours', data: { ...(initial ?? {}), consultation_document_ids: documentIds, consultation_teams: nextTeams, consultation_deadline: deadline, consultation_followup: followup, ...extra } }))
  }
  const addTeam = () => {
    const next = [...teams, { id: crypto.randomUUID(), name: `Équipe ${teams.length + 1}`, members: [] }]
    setTeams(next); setForm((current) => ({ ...current, teamId: next.at(-1)!.id })); void saveWorkflow(next)
  }
  const addMember = async () => {
    const partner = (project.partenaires ?? []).find((item) => String(item.id) === form.partnerId)
    const name = partner?.nom_entreprise ?? form.name.trim()
    const email = partner?.email ?? form.email.trim()
    if (!form.teamId || !form.lot.trim() || !name) return setMessage('Sélectionnez une équipe et renseignez le lot et l’entreprise.')
    setBusy(true); setMessage('')
    try {
      let lot: { id: number; nom: string } | undefined = (project.lots ?? []).find((item) => item.nom.trim().toLocaleLowerCase('fr') === form.lot.trim().toLocaleLowerCase('fr'))
      if (!lot) lot = (await api.post<{ id: number; nom: string }>(`/projets/${project.id}/lots`, { nom: form.lot.trim(), statut: 'en_cours' })).data
      const quote = (await api.post<Devis>('/devis', { projet_id: project.id, lot_id: lot!.id, partenaire_id: partner?.id, partenaire_nom: name, lot: form.lot.trim(), type: 'artisan', statut: 'en_attente', phase: 'etude_faisabilite', date_butoir: deadline || undefined })).data
      const member: ConsultationMember = { id: crypto.randomUUID(), quoteId: quote.id, lotId: lot!.id, partnerId: partner?.id, name, email, phone: partner?.telephone ?? form.phone.trim(), lot: form.lot.trim() }
      const next = teams.map((team) => team.id === form.teamId ? { ...team, members: [...team.members, member] } : team)
      setTeams(next); setForm((current) => ({ ...current, partnerId: '', name: '', email: '', phone: '', lot: '' })); await saveWorkflow(next); await onChanged()
    } catch { setMessage('Impossible d’ajouter cet artisan à l’équipe.') } finally { setBusy(false) }
  }
  const removeMember = (teamId: string, memberId: string) => {
    const next = teams.map((team) => team.id === teamId ? { ...team, members: team.members.filter((member) => member.id !== memberId) } : team)
    setTeams(next); void saveWorkflow(next)
  }
  const setStatus = async (member: ConsultationMember, status: ConsultationStatus) => {
    const nextFollowup = { ...followup, [member.id]: status }
    setFollowup(nextFollowup)
    if (member.quoteId) await api.patch(`/devis/${member.quoteId}`, { statut: status, date_butoir: deadline || undefined })
    await Promise.resolve(onSave({ status: 'en_cours', data: { ...(initial ?? {}), consultation_document_ids: documentIds, consultation_teams: teams, consultation_deadline: deadline, consultation_followup: nextFollowup } }))
    await onChanged()
  }
  const openMail = (recipients: ConsultationMember[], reminder = false) => {
    const emails = recipients.map((member) => member.email).filter(Boolean).join(',')
    const selectedNames = availableDocuments.filter((document) => documentIds.includes(document.id)).map((document) => document.nom).join(', ')
    const subject = `${reminder ? 'Relance' : 'Demande de chiffrage'} — ${project.nom}`
    const body = `${reminder ? 'Bonjour,\n\nNous revenons vers vous concernant' : 'Bonjour,\n\nNous souhaitons vous consulter pour'} le projet ${project.nom}.\n\nLots : ${recipients.map((member) => member.lot).join(', ')}\nDate limite : ${deadline ? new Date(deadline).toLocaleString('fr-FR') : 'à convenir'}\nDocuments à joindre : ${selectedNames || 'aucun'}\n\nMerci de nous transmettre votre offre.`
    window.location.href = `mailto:${encodeURIComponent(emails)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  const sendConsultation = async () => {
    if (!documentIds.length || !members.length || !deadline) return setMessage('Sélectionnez les documents, les artisans et la date limite avant l’envoi.')
    setBusy(true); setMessage('')
    try {
      const nextFollowup = { ...followup }
      await Promise.all(members.map(async (member) => { nextFollowup[member.id] = 'envoye'; if (member.quoteId) await api.patch(`/devis/${member.quoteId}`, { statut: 'envoye', date_butoir: deadline }) }))
      setFollowup(nextFollowup)
      await Promise.resolve(onSave({ status: 'en_cours', data: { ...(initial ?? {}), consultation_document_ids: documentIds, consultation_teams: teams, consultation_deadline: deadline, consultation_followup: nextFollowup, consultation_sent_at: new Date().toISOString() } }))
      await onChanged(); openMail(members)
    } catch { setMessage('Impossible de préparer l’envoi de la consultation.') } finally { setBusy(false) }
  }
  const retain = async (member: ConsultationMember) => {
    if (!member.quoteId || !member.lotId) return
    setBusy(true); setMessage('')
    try { await api.post(`/lots/${member.lotId}/attribuer`, { devis_id: member.quoteId }); await onChanged() } catch { setMessage('Impossible de retenir cette offre.') } finally { setBusy(false) }
  }

  return <div className="mt-5 space-y-4">
    <Section title="Étape 1 — Documents à envoyer" icon={FileText}>
      <div className="grid gap-2 sm:grid-cols-2">{availableDocuments.map((document) => <label key={document.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"><input type="checkbox" checked={documentIds.includes(document.id)} onChange={() => setDocumentIds((current) => current.includes(document.id) ? current.filter((id) => id !== document.id) : [...current, document.id])} className="h-4 w-4 rounded text-blue-600" /><FileText className="h-4 w-4 text-blue-500" /><span className="min-w-0 truncate text-xs font-medium">{document.nom}</span></label>)}</div>
      {!availableDocuments.length && <Empty text="Aucun document disponible. Ajoutez d’abord l’esquisse et la notice." />}
      <SaveButton label="Valider la sélection" onClick={() => void saveWorkflow()} />
    </Section>

    <Section title="Étape 2 — Constitution des équipes" icon={Users}>
      <div className="grid gap-3 lg:grid-cols-2">{teams.map((team) => <article key={team.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between"><input value={team.name} onChange={(event) => setTeams((current) => current.map((item) => item.id === team.id ? { ...item, name: event.target.value } : item))} onBlur={() => void saveWorkflow()} className="w-40 bg-transparent text-sm font-bold outline-none" />{teams.length > 1 && <button type="button" onClick={() => { const next = teams.filter((item) => item.id !== team.id); setTeams(next); void saveWorkflow(next) }} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div><div className="mt-2 space-y-2">{team.members.map((member) => <div key={member.id} className="rounded-lg bg-white p-2 text-xs"><div className="flex gap-2"><div className="min-w-0 flex-1"><p className="font-semibold">{member.name}</p><p className="truncate text-slate-400">{member.lot} · {member.email || 'Email non renseigné'}</p></div><button type="button" onClick={() => removeMember(team.id, member.id)} className="text-slate-300 hover:text-red-600"><X className="h-4 w-4" /></button></div></div>)}{!team.members.length && <p className="py-3 text-center text-xs italic text-slate-400">Aucun artisan</p>}</div></article>)}</div>
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><p className="mb-3 text-xs font-bold text-blue-800">Ajouter un artisan</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Field label="Équipe"><select value={form.teamId} onChange={(event) => setForm({ ...form, teamId: event.target.value })} className={fieldClass}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field><Field label="Depuis le carnet"><select value={form.partnerId} onChange={(event) => setForm({ ...form, partnerId: event.target.value })} className={fieldClass}><option value="">Saisie manuelle</option>{(project.partenaires ?? []).map((partner) => <option key={partner.id} value={partner.id}>{partner.nom_entreprise}</option>)}</select></Field><Field label="Lot"><input value={form.lot} onChange={(event) => setForm({ ...form, lot: event.target.value })} placeholder="Lot 1 - Maçonnerie" className={fieldClass} /></Field>{!form.partnerId && <><Field label="Entreprise"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass} /></Field><Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} /></Field><Field label="Téléphone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={fieldClass} /></Field></>}</div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void addMember()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><UserPlus className="h-4 w-4" />Ajouter à l’équipe</button><button type="button" onClick={addTeam} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-xs font-semibold text-blue-700"><Plus className="h-4 w-4" />Ajouter une équipe</button></div></div>
    </Section>

    <Section title="Étape 3 — Envoi" icon={Send}>
      <Field label="Date et heure limite de remise des devis"><input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} onBlur={() => void saveWorkflow()} className={fieldClass} /></Field>
      <button type="button" disabled={busy} onClick={() => void sendConsultation()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Mail className="h-4 w-4" />Envoyer la consultation à toutes les équipes</button>
    </Section>

    <Section title="Étape 4 — Suivi par lot" icon={Building2}>
      <div className="space-y-3">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-48 flex-1"><p className="text-xs font-bold">{member.lot}</p><p className="mt-1 text-xs text-slate-500">{member.name}</p></div><select disabled={busy} value={followup[member.id] ?? 'envoye'} onChange={(event) => void setStatus(member, event.target.value as ConsultationStatus)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"><option value="envoye">Envoyé</option><option value="relance">Relancé</option><option value="recu">Reçu</option><option value="retard">En retard</option><option value="inactif">Inactif</option></select><button type="button" onClick={() => { void setStatus(member, 'relance'); openMail([member], true) }} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">Relancer</button></div>)}</div>
      {!members.length && <Empty text="Aucun artisan à suivre." />}
    </Section>

    <Section title="Étape 5 — Sélection finale" icon={CheckCircle2}>
      <div className="space-y-2">{members.filter((member) => ['recu', 'valide'].includes(followup[member.id] ?? '') || quotes.find((quote) => quote.id === member.quoteId)?.statut === 'recu').map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-emerald-900">{member.lot}</p><p className="text-xs text-emerald-700">{member.name}</p></div><button type="button" disabled={busy} onClick={() => void retain(member)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Retenir</button></div>)}</div>
      {!members.some((member) => followup[member.id] === 'recu' || quotes.find((quote) => quote.id === member.quoteId)?.statut === 'recu') && <p className="text-xs italic text-slate-400">En attente d’au moins un devis reçu pour activer la sélection.</p>}
    </Section>
    <ActionMessage text={message} />
    <SaveButton label="Enregistrer la consultation" onClick={() => onSave({ status: activeStatus(trackingStep), data: { ...(initial ?? {}), consultation_document_ids: documentIds, consultation_teams: teams, consultation_deadline: deadline, consultation_followup: followup, consulted_count: members.length } })} />
  </div>
}

function OfferComparison({ project, trackingStep, onSave, onChanged }: Props) {
  const quotes = (project.devis ?? []).filter((quote) => quote.type === 'artisan' && quote.phase === 'etude_faisabilite')
  const teamData = dataArray<ConsultationTeam>(consultationStepData(project), 'consultation_teams')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const update = async (quote: Devis, payload: Record<string, unknown>) => {
    setBusy(true); setMessage('')
    try { await api.patch(`/devis/${quote.id}`, payload); await onChanged() } catch { setMessage('Impossible de modifier cette offre.') } finally { setBusy(false) }
  }
  const uploadOffer = async (quote: Devis, file?: File) => {
    if (!file) return
    setBusy(true); setMessage('')
    try {
      const data = new FormData()
      data.append('file', file); data.append('projet_id', String(project.id)); data.append('phase', 'etude_faisabilite'); data.append('type_document', 'devis'); data.append('nom', `Offre ${quote.partenaire?.nom_entreprise ?? quote.partenaire_nom ?? quote.id} - ${file.name}`)
      const response = await api.post<{ document: Document }>('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      await api.patch(`/devis/${quote.id}`, { document_id: response.data.document.id, statut: 'recu' })
      await onChanged()
    } catch { setMessage('Impossible d’attacher ce devis.') } finally { setBusy(false) }
  }
  const groups = teamData.length ? teamData.map((team) => ({ name: team.name, quotes: team.members.map((member) => quotes.find((quote) => quote.id === member.quoteId)).filter((quote): quote is Devis => Boolean(quote)) })) : [{ name: 'Équipe 1', quotes }]
  const assignedQuoteIds = new Set(groups.flatMap((group) => group.quotes.map((quote) => quote.id)))
  const unmatched = quotes.filter((quote) => !assignedQuoteIds.has(quote.id))
  if (unmatched.length) groups.push({ name: 'Offres hors équipe', quotes: unmatched })
  const totalHt = quotes.reduce((sum, quote) => sum + Number(quote.montant_ht ?? 0), 0)
  const totalTtc = quotes.reduce((sum, quote) => sum + Number(quote.montant_ttc ?? 0), 0)
  const exportPdf = () => {
    const content = document.getElementById(`comparatif-${project.id}`)?.innerHTML
    if (!content) return
    const popup = window.open('', '_blank', 'width=1100,height=800')
    if (!popup) return setMessage('Autorisez l’ouverture de la fenêtre d’impression.')
    popup.document.write(`<html><head><title>Comparatif - ${project.nom}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}h3{margin-top:28px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px;border:1px solid #cbd5e1;text-align:left}button,input,select,label{display:none}.print-total{display:block;text-align:right;font-weight:bold;margin-top:10px}</style></head><body><h1>Comparatif des offres — ${project.nom}</h1>${content}</body></html>`)
    popup.document.close(); popup.focus(); popup.print()
  }
  const minimumForLot = (quote: Devis) => {
    const lotId = quote.lot_id ?? quote.lot ?? 'none'
    const amounts = quotes.filter((item) => (item.lot_id ?? item.lot ?? 'none') === lotId && item.montant_ht != null).map((item) => Number(item.montant_ht))
    return amounts.length > 1 && quote.montant_ht != null && Number(quote.montant_ht) === Math.min(...amounts)
  }
  return <div className="mt-5"><Section title={`Comparatif offres · ${quotes.length}`} icon={Scale}>
    <button type="button" onClick={exportPdf} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700"><Printer className="h-4 w-4" />Exporter le comparatif PDF</button>
    {quotes.length ? <div id={`comparatif-${project.id}`} className="space-y-5">{groups.filter((group) => group.quotes.length).map((group) => {
      const groupHt = group.quotes.reduce((sum, quote) => sum + Number(quote.montant_ht ?? 0), 0)
      return <article key={group.name} className="overflow-hidden rounded-xl border border-slate-200"><h3 className="bg-slate-900 px-4 py-3 text-sm font-bold text-white">{group.name}</h3><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-3">Lot</th><th className="px-3 py-3">Artisan</th><th className="px-3 py-3">Montant HT</th><th className="px-3 py-3">Montant TTC</th><th className="px-3 py-3">Conformité CCTP</th><th className="px-3 py-3">Décision</th></tr></thead><tbody>{group.quotes.map((quote) => {
        const linkedDocument = (project.documents ?? []).find((document) => document.id === quote.document_id)
        return <tr key={quote.id} className={`border-t border-slate-100 ${minimumForLot(quote) ? 'bg-emerald-50' : ''}`}><td className="px-3 py-3 font-semibold">{quote.lot_reference?.nom ?? quote.lot ?? 'Sans lot'}</td><td className="px-3 py-3">{quote.partenaire?.nom_entreprise ?? quote.partenaire_nom ?? 'Non renseigné'}</td><td className="px-3 py-3"><input type="number" defaultValue={quote.montant_ht ?? ''} onBlur={(event) => { const ht = Number(event.target.value); void update(quote, { montant_ht: ht || null, montant_ttc: ht ? ht * (1 + Number(quote.taux_tva ?? 20) / 100) : null }) }} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right" /> €</td><td className="px-3 py-3 font-semibold">{money(quote.montant_ttc)}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><select value={quote.cctp_compliance ?? 'a_verifier'} onChange={(event) => void update(quote, { cctp_compliance: event.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5"><option value="a_verifier">À analyser</option><option value="conforme">Conforme</option><option value="reserves">Avec réserves</option><option value="non_conforme">Non conforme</option></select><label title="Attacher le devis" className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-blue-600"><Upload className="h-3.5 w-3.5" /><input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => { void uploadOffer(quote, event.target.files?.[0]); event.target.value = '' }} /></label></div>{linkedDocument && <p className="mt-1 max-w-48 truncate text-[10px] text-blue-600">{linkedDocument.nom}</p>}</td><td className="px-3 py-3"><div className="flex gap-1"><button type="button" disabled={busy} onClick={() => void update(quote, { statut: 'valide' })} className={`rounded-lg px-2.5 py-1.5 font-semibold ${quote.statut === 'valide' ? 'bg-emerald-600 text-white' : 'border border-emerald-200 text-emerald-700'}`}>Retenu</button><button type="button" disabled={busy} onClick={() => void update(quote, { statut: 'refuse' })} className={`rounded-lg px-2.5 py-1.5 font-semibold ${quote.statut === 'refuse' ? 'bg-red-600 text-white' : 'border border-red-200 text-red-700'}`}>Non retenu</button></div></td></tr>
      })}</tbody></table></div><p className="print-total bg-slate-50 px-4 py-3 text-right text-xs font-bold">TOTAL {group.name} : {money(groupHt)} HT</p></article>
    })}</div> : <Empty text="Aucune offre artisan à comparer." />}
    <ActionMessage text={message} /><SaveButton label="Enregistrer le comparatif" onClick={() => onSave({ status: activeStatus(trackingStep), data: { ...(trackingStep?.data ?? {}), offer_count: quotes.length, total_ht: totalHt, total_ttc: totalTtc } })} />
  </Section></div>
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 p-4"><div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-4 w-4" /></span><h3 className="text-xs font-bold uppercase tracking-[.08em] text-slate-700">{title}</h3></div>{children}</section> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}{children}</label> }
function Info({ label, value: text }: { label: string; value: string }) { return <div className="mb-3 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-700">{text}</p></div> }
function SaveButton({ onClick, label = 'Enregistrer' }: { onClick: () => void; label?: string }) { return <button type="button" onClick={onClick} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Save className="h-4 w-4" />{label}</button> }
function ActionMessage({ text }: { text: string }) { return text ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{text}</p> : null }
function DocumentItem({ document }: { document: Document }) { const done = completeStatuses.includes(document.workflow_status); return <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><FileText className="h-4 w-4 text-blue-500" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{document.nom}</p><p className="mt-0.5 text-[11px] text-slate-400">{document.workflow_status.replaceAll('_', ' ')}</p></div>{done && <Check className="h-4 w-4 text-emerald-500" />}</div> }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400">{text}</p> }
const money = (amount?: number) => amount === undefined || amount === null ? '—' : `${Number(amount).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`
