import { useState } from 'react'
import { CalendarDays, Check, Euro, FileText, Landmark, Save, Upload } from 'lucide-react'
import api from '@/lib/api'
import type { Devis, Document, ProjectStep, Projet } from '@/types'

type StepStatus = ProjectStep['status']
type SavePayload = { status: StepStatus; notes?: string; data?: Record<string, unknown> }

interface Props {
  project: Projet
  stepCode: string
  trackingStep?: ProjectStep
  onSave: (payload: SavePayload) => void
  onChanged: () => Promise<unknown> | void
}

const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
const activeStatus = (step?: ProjectStep): StepStatus => step?.status === 'terminee' || step?.status === 'sans_objet' ? step.status : 'en_cours'
const dateValue = (value?: string) => value?.slice(0, 10) ?? ''

export default function AdministrativeDetail(props: Props) {
  if (props.stepCode === 'honoraires-2') return <AdministrativeFees {...props} />
  if (props.stepCode === 'documents-client') return <DocumentUploadStep {...props} mode="client" />
  if (props.stepCode === 'plans-admin') return <DocumentUploadStep {...props} mode="plans" />
  if (props.stepCode === 'depot-instruction') return <InstructionForm {...props} />
  return <SiteSign {...props} />
}

function AdministrativeFees({ project, trackingStep, onSave, onChanged }: Props) {
  const quotes = (project.devis ?? []).filter((quote) => quote.type === 'mo' && quote.phase === 'consultation_entreprises')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const create = async () => {
    const ht = Number(amount)
    if (!ht || ht <= 0) return setError('Saisissez un montant HT valide.')
    setBusy(true); setError('')
    try {
      await api.post('/devis', { projet_id: project.id, type: 'mo', partenaire_nom: 'Honoraires phase administrative', montant_ht: ht, taux_tva: 20, montant_ttc: ht * 1.2, statut: 'en_attente', phase: 'consultation_entreprises' })
      setAmount(''); await onChanged()
    } catch { setError('Impossible de créer le devis d’honoraires.') } finally { setBusy(false) }
  }
  const setStatus = async (quote: Devis, statut: string) => {
    setBusy(true); setError('')
    try { await api.patch(`/devis/${quote.id}`, { statut }); await onChanged() } catch { setError('Impossible de mettre à jour le devis.') } finally { setBusy(false) }
  }
  return <Panel title={`Honoraires administratifs · ${quotes.length}`} icon={Euro}>
    {quotes.map((quote) => <div key={quote.id} className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold">{money(quote.montant_ttc)}</p><p className="text-xs text-slate-400">{quote.statut.replaceAll('_', ' ')}</p></div><select disabled={busy} value={quote.statut} onChange={(event) => void setStatus(quote, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs"><option value="en_attente">À envoyer</option><option value="recu">Réponse reçue</option><option value="valide">Validé</option><option value="refuse">Refusé</option></select></div>)}
    {!quotes.length && <Empty text="Aucun devis d’honoraires pour cette phase." />}
    <div className="mt-4 flex items-end gap-2"><Field label="Montant HT"><input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className={fieldClass} /></Field><button type="button" disabled={busy} onClick={() => void create()} className="mb-3 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white">Créer</button></div>
    <Error text={error} /><SaveButton onClick={() => onSave({ status: activeStatus(trackingStep), data: { quote_count: quotes.length } })} />
  </Panel>
}

function DocumentUploadStep({ project, trackingStep, onSave, onChanged, mode }: Props & { mode: 'client' | 'plans' }) {
  const isPlans = mode === 'plans'
  const documents = (project.documents ?? []).filter((document) => document.phase === 'consultation_entreprises' && (isPlans ? document.type_document === 'plan' || /\b(pc|dp|at)\b|plan administratif/i.test(document.nom) : document.type_document !== 'plan' && /client|identit|propri|kbis|statut/i.test(document.nom)))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true); setError('')
    const data = new FormData()
    data.append('file', file); data.append('projet_id', String(project.id)); data.append('phase', 'consultation_entreprises'); data.append('type_document', isPlans ? 'plan' : 'autre'); data.append('nom', name || file.name)
    try { await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }); setName(''); await onChanged() } catch { setError('Échec du dépôt. Formats acceptés : PDF, JPEG ou PNG.') } finally { setBusy(false) }
  }
  return <Panel title={isPlans ? `Plans PC / DP / AT · ${documents.length}` : `Documents client · ${documents.length}`} icon={FileText}>
    {documents.map((document) => <DocumentRow key={document.id} document={document} />)}
    {!documents.length && <Empty text={isPlans ? 'Aucun plan administratif déposé.' : 'Aucune pièce administrative du client.'} />}
    <Field label="Nom du document"><input value={name} onChange={(event) => setName(event.target.value)} placeholder={isPlans ? 'Plan DP – Façades' : 'Titre de propriété client'} className={fieldClass} /></Field>
    <Error text={error} /><div className="flex flex-wrap gap-2"><label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />{busy ? 'Dépôt...' : 'Déposer un fichier'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label><SaveButton onClick={() => onSave({ status: activeStatus(trackingStep), data: { document_count: documents.length } })} /></div>
  </Panel>
}

function InstructionForm({ project, trackingStep, onSave, onChanged }: Props) {
  const current = project.permit_instruction
  const [form, setForm] = useState({
    application_type: current?.application_type ?? 'DP', receipt_number: current?.receipt_number ?? '',
    submitted_at: dateValue(current?.submitted_at), instruction_deadline: dateValue(current?.instruction_deadline),
    decision: current?.decision ?? 'en_instruction', decision_at: dateValue(current?.decision_at),
    order_reference: current?.order_reference ?? '', purge_at: dateValue(current?.purge_at),
    appeal_deadline: dateValue(current?.appeal_deadline), notes: current?.notes ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (key: keyof typeof form, value: string) => setForm((state) => ({ ...state, [key]: value }))
  const save = async () => {
    setBusy(true); setError('')
    try {
      await api.put(`/projets/${project.id}/permit-instruction`, form)
      await onChanged(); onSave({ status: activeStatus(trackingStep), data: { application_type: form.application_type, receipt_number: form.receipt_number } })
    } catch (caught) { setError(apiError(caught)) } finally { setBusy(false) }
  }
  return <Panel title="Dépôt, instruction et purge" icon={Landmark}>
    <div className="grid gap-3 md:grid-cols-2"><Field label="Type de demande"><select value={form.application_type} onChange={(event) => update('application_type', event.target.value)} className={fieldClass}><option>PC</option><option>DP</option><option>AT</option><option>PA</option><option value="autre">Autre</option></select></Field><Field label="N° de récépissé"><input value={form.receipt_number} onChange={(event) => update('receipt_number', event.target.value)} className={fieldClass} /></Field><DateField label="Date de dépôt" value={form.submitted_at} onChange={(next) => update('submitted_at', next)} /><DateField label="Échéance d’instruction" value={form.instruction_deadline} onChange={(next) => update('instruction_deadline', next)} /><Field label="Décision"><select value={form.decision} onChange={(event) => update('decision', event.target.value)} className={fieldClass}><option value="en_instruction">En instruction</option><option value="pieces_complementaires">Pièces complémentaires</option><option value="accordee">Accordée</option><option value="refusee">Refusée</option></select></Field><DateField label="Date de décision" value={form.decision_at} onChange={(next) => update('decision_at', next)} /><Field label="Référence de l’arrêté"><input value={form.order_reference} onChange={(event) => update('order_reference', event.target.value)} className={fieldClass} /></Field><DateField label="Fin du délai de recours" value={form.appeal_deadline} onChange={(next) => update('appeal_deadline', next)} /><DateField label="Date de purge" value={form.purge_at} onChange={(next) => update('purge_at', next)} /></div>
    <Field label="Notes"><textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={fieldClass} /></Field><Error text={error} /><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{busy ? 'Enregistrement...' : 'Enregistrer le suivi'}</button>
  </Panel>
}

function SiteSign({ project, trackingStep, onSave, onChanged }: Props) {
  const current = project.permit_instruction
  const proofs = (project.documents ?? []).filter((document) => document.phase === 'consultation_entreprises' && /panneau|affichage/i.test(document.nom))
  const [displayedAt, setDisplayedAt] = useState(dateValue(current?.sign_displayed_at))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saveDate = async () => {
    setBusy(true); setError('')
    try { await api.put(`/projets/${project.id}/permit-instruction`, { sign_displayed_at: displayedAt || null }); await onChanged(); onSave({ status: activeStatus(trackingStep), data: { sign_displayed_at: displayedAt, proof_count: proofs.length } }) } catch (caught) { setError(apiError(caught)) } finally { setBusy(false) }
  }
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true); setError('')
    const data = new FormData(); data.append('file', file); data.append('projet_id', String(project.id)); data.append('phase', 'consultation_entreprises'); data.append('type_document', 'photo'); data.append('nom', `Preuve panneau ${file.name}`)
    try { await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }); await onChanged() } catch { setError('Impossible de déposer la preuve du panneau.') } finally { setBusy(false) }
  }
  return <Panel title="Panneau de chantier" icon={CalendarDays}>
    <DateField label="Date d’affichage" value={displayedAt} onChange={setDisplayedAt} />
    {proofs.map((document) => <DocumentRow key={document.id} document={document} />)}
    {!proofs.length && <Empty text="Aucune preuve photographique déposée." />}
    <Error text={error} /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void saveDate()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white"><Save className="h-4 w-4" />Enregistrer la date</button><label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-700 ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />Déposer une preuve<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label></div>
  </Panel>
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) { return <section className="mt-5 rounded-2xl border border-slate-200 p-4"><div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Icon className="h-4 w-4" /></span><h3 className="text-xs font-bold uppercase tracking-[.08em] text-slate-700">{title}</h3></div>{children}</section> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mb-3 block w-full text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}{children}</label> }
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} /></Field> }
function SaveButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-700"><Save className="h-4 w-4" />Enregistrer l’étape</button> }
function DocumentRow({ document }: { document: Document }) { const done = ['valide', 'signe', 'archive'].includes(document.workflow_status); return <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><FileText className="h-4 w-4 text-emerald-500" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{document.nom}</p><p className="text-[11px] text-slate-400">{document.workflow_status.replaceAll('_', ' ')}</p></div>{done && <Check className="h-4 w-4 text-emerald-500" />}</div> }
function Empty({ text }: { text: string }) { return <p className="mb-3 rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400">{text}</p> }
function Error({ text }: { text: string }) { return text ? <p className="mb-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">{text}</p> : null }
const money = (amount?: number) => amount === undefined || amount === null ? '—' : `${Number(amount).toLocaleString('fr-FR')} €`
const apiError = (error: unknown) => { const item = error as { response?: { data?: { error?: { message?: string; details?: Record<string, string[]> } } } }; return Object.values(item.response?.data?.error?.details ?? {}).flat()[0] ?? item.response?.data?.error?.message ?? 'Impossible d’enregistrer ces informations.' }
