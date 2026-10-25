import { useState } from 'react'
import { Building2, CalendarDays, Check, Circle, Euro, FileCheck2, FileText, Plus, Save, Scale, Upload, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import type { Devis, Document, ProjectStep, Projet } from '@/types'

type StepStatus = ProjectStep['status']
type StepData = Record<string, unknown>
type SavePayload = { status: StepStatus; notes?: string; data?: StepData }

interface Props {
  project: Projet
  stepCode: string
  trackingStep?: ProjectStep
  onSave: (payload: SavePayload) => void
  onChanged: () => Promise<unknown> | void
}

const completeStatuses = ['valide', 'signe', 'archive']
const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const activeStatus = (step?: ProjectStep): StepStatus => step?.status === 'terminee' || step?.status === 'sans_objet' ? step.status : 'en_cours'
const value = (data: StepData | undefined, key: string) => typeof data?.[key] === 'string' ? data[key] as string : ''
const flag = (data: StepData | undefined, key: string) => data?.[key] === true

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

function FeasibilityAnalysis({ project, trackingStep, onSave }: Props) {
  const initial = trackingStep?.data
  const [checks, setChecks] = useState({
    site_visit: flag(initial, 'site_visit'),
    urban_rules: flag(initial, 'urban_rules'),
    technical_constraints: flag(initial, 'technical_constraints'),
    budget_compatible: flag(initial, 'budget_compatible'),
  })
  const [conclusion, setConclusion] = useState(value(initial, 'conclusion'))
  const rules = [
    ['site_visit', 'Visite du site réalisée'],
    ['urban_rules', 'Règles d’urbanisme vérifiées'],
    ['technical_constraints', 'Contraintes techniques analysées'],
    ['budget_compatible', 'Budget compatible avec le programme'],
  ] as const
  const businessChecks = project.phase_checks_summary ?? []

  return <div className="mt-5 grid gap-4 2xl:grid-cols-2">
    <Section title="Checklist d’analyse" icon={FileCheck2}>
      <div className="space-y-2">{rules.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={checks[key]} onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{label}</label>)}</div>
      <Field label="Conclusion de faisabilité"><textarea rows={4} value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="Faisable, réserves éventuelles et prochaines décisions" className={fieldClass} /></Field>
      <SaveButton onClick={() => onSave({ status: activeStatus(trackingStep), data: { ...checks, conclusion } })} />
    </Section>
    <Section title="Prérequis du dossier" icon={FileCheck2}>
      {businessChecks.length ? <div className="space-y-2">{businessChecks.map((check) => <div key={check.label} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">{check.done ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-500 text-white"><Check className="h-3.5 w-3.5" /></span> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />}<div><p className="text-xs font-semibold text-slate-700">{check.label}</p>{!check.done && <p className="mt-1 text-[11px] text-amber-700">{check.alert}</p>}</div></div>)}</div> : <Empty text="Aucun prérequis calculé." />}
      <ProjectLink project={project} label="Compléter les informations du projet" />
    </Section>
  </div>
}

function QuoteValidation({ project, trackingStep, onSave, onChanged }: Props) {
  const quotes = (project.devis ?? []).filter((quote) => quote.type === 'mo' && quote.phase === 'etude_faisabilite')
  const contracts = (project.documents ?? []).filter((document) => ['devis', 'contrat'].includes(document.type_document) && (!document.phase || document.phase === 'etude_faisabilite'))
  const [form, setForm] = useState({ amount: '', vat: '20', notes: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const createQuote = async () => {
    const ht = Number(form.amount)
    if (!ht || ht <= 0) return setMessage('Saisissez un montant HT valide.')
    setBusy(true); setMessage('')
    try {
      const vat = Number(form.vat || 0)
      await api.post('/devis', { projet_id: project.id, type: 'mo', partenaire_nom: 'Honoraires MOE', montant_ht: ht, taux_tva: vat, montant_ttc: ht * (1 + vat / 100), statut: 'en_attente', phase: 'etude_faisabilite', notes: form.notes })
      setForm({ amount: '', vat: '20', notes: '' }); await onChanged()
    } catch { setMessage('Impossible de créer le devis d’honoraires.') } finally { setBusy(false) }
  }
  const updateQuote = async (quote: Devis, status: string) => {
    setBusy(true); setMessage('')
    try { await api.patch(`/devis/${quote.id}`, { statut: status }); await onChanged() } catch { setMessage('Impossible de modifier la validation du devis.') } finally { setBusy(false) }
  }

  return <div className="mt-5 grid gap-4 2xl:grid-cols-2">
    <Section title={`Devis honoraires MOE · ${quotes.length}`} icon={Euro}>
      {quotes.length ? quotes.map((quote) => <QuoteRow key={quote.id} quote={quote} action={<select disabled={busy} value={quote.statut} onChange={(event) => updateQuote(quote, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"><option value="en_attente">À envoyer</option><option value="recu">Envoyé</option><option value="valide">Validé client</option><option value="refuse">Refusé</option></select>} />) : <Empty text="Aucun devis d’honoraires enregistré." />}
      <div className="mt-4 grid grid-cols-2 gap-3"><Field label="Montant HT"><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className={fieldClass} /></Field><Field label="TVA %"><input type="number" min="0" step="0.1" value={form.vat} onChange={(event) => setForm({ ...form, vat: event.target.value })} className={fieldClass} /></Field></div>
      <Field label="Notes"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={fieldClass} /></Field>
      <ActionMessage text={message} /><button type="button" disabled={busy} onClick={createQuote} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Créer le devis</button>
    </Section>
    <Section title="Validation client" icon={FileCheck2}>
      {contracts.length ? contracts.map((document) => <DocumentItem key={document.id} document={document} />) : <Empty text="Aucun document de devis ou contrat enregistré." />}
      <p className="mt-3 text-xs text-slate-500">Le devis est considéré validé lorsque son statut est « Validé client » ou lorsqu’un document signé est présent.</p>
      <SaveButton label="Enregistrer les notes" onClick={() => onSave({ status: activeStatus(trackingStep), data: trackingStep?.data ?? {} })} />
    </Section>
  </div>
}

function SketchNotice({ project, trackingStep, onSave, onChanged }: Props) {
  const documents = (project.documents ?? []).filter((document) => document.phase === 'etude_faisabilite' && (document.type_document === 'plan' || /esq|esquisse|notice|descriptif/i.test(document.nom)))
  const [kind, setKind] = useState<'plan' | 'autre'>('plan')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true); setMessage('')
    const data = new FormData()
    data.append('file', file); data.append('projet_id', String(project.id)); data.append('phase', 'etude_faisabilite'); data.append('type_document', kind); data.append('nom', name || file.name)
    try { await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }); setName(''); await onChanged() } catch { setMessage('Échec du dépôt. Formats acceptés : PDF, JPEG ou PNG (10 Mo maximum).') } finally { setBusy(false) }
  }
  return <div className="mt-5 space-y-4">
    <Section title={`Esquisses et notices · ${documents.length}`} icon={FileText}>{documents.length ? documents.map((document) => <DocumentItem key={document.id} document={document} />) : <Empty text="Aucun document ESQ ou notice détecté." />}</Section>
    <Section title="Ajouter un document" icon={Upload}>
      <div className="grid gap-3 md:grid-cols-2"><Field label="Nom"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Esquisse V1 ou Notice descriptive" className={fieldClass} /></Field><Field label="Type"><select value={kind} onChange={(event) => setKind(event.target.value as 'plan' | 'autre')} className={fieldClass}><option value="plan">Esquisse / Plan</option><option value="autre">Notice descriptive</option></select></Field></div>
      <ActionMessage text={message} /><label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />{busy ? 'Dépôt...' : 'Choisir et déposer'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label>
      <SaveButton label="Enregistrer l’étape" onClick={() => onSave({ status: activeStatus(trackingStep), data: { document_count: documents.length } })} />
    </Section>
  </div>
}

function ArtisanConsultation({ project, trackingStep, onSave, onChanged }: Props) {
  const quotes = (project.devis ?? []).filter((quote) => quote.type === 'artisan' && quote.phase === 'etude_faisabilite')
  const [form, setForm] = useState({ lot: '', artisan: '', amount: '', vat: '20', deadline: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const create = async () => {
    if (!form.lot.trim() || !form.artisan.trim()) return setMessage('Le lot et le nom de l’artisan sont obligatoires.')
    setBusy(true); setMessage('')
    try {
      const { data: lot } = await api.post<{ id: number }>(`/projets/${project.id}/lots`, { nom: form.lot, artisan_nom: form.artisan, statut: 'en_cours' })
      const ht = form.amount ? Number(form.amount) : undefined
      const vat = Number(form.vat || 0)
      await api.post('/devis', { projet_id: project.id, lot_id: lot.id, type: 'artisan', partenaire_nom: form.artisan, lot: form.lot, montant_ht: ht, montant_ttc: ht === undefined ? undefined : ht * (1 + vat / 100), taux_tva: vat, statut: ht === undefined ? 'en_attente' : 'recu', phase: 'etude_faisabilite', date_butoir: form.deadline || undefined })
      setForm({ lot: '', artisan: '', amount: '', vat: '20', deadline: '' }); await onChanged()
    } catch { setMessage('Impossible d’ajouter cette consultation initiale.') } finally { setBusy(false) }
  }
  return <div className="mt-5 grid gap-4 2xl:grid-cols-2">
    <Section title={`Consultations initiales · ${quotes.length}`} icon={Building2}>{quotes.length ? quotes.map((quote) => <QuoteRow key={quote.id} quote={quote} />) : <Empty text="Aucun artisan consulté pour cette phase." />}<ProjectLink project={project} label="Gérer les intervenants du projet" /></Section>
    <Section title="Ajouter un artisan par lot" icon={Plus}>
      <div className="grid grid-cols-2 gap-3"><Field label="Lot"><input value={form.lot} onChange={(event) => setForm({ ...form, lot: event.target.value })} placeholder="Plomberie" className={fieldClass} /></Field><Field label="Artisan"><input value={form.artisan} onChange={(event) => setForm({ ...form, artisan: event.target.value })} placeholder="Entreprise" className={fieldClass} /></Field><Field label="Montant HT (optionnel)"><input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className={fieldClass} /></Field><Field label="Date de retour"><input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className={fieldClass} /></Field></div>
      <ActionMessage text={message} /><button type="button" disabled={busy} onClick={create} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Ajouter à la consultation</button>
      <SaveButton label="Enregistrer l’étape" onClick={() => onSave({ status: activeStatus(trackingStep), data: { consulted_count: quotes.length } })} />
    </Section>
  </div>
}

function OfferComparison({ project, trackingStep, onSave, onChanged }: Props) {
  const quotes = (project.devis ?? []).filter((quote) => quote.type === 'artisan' && quote.phase === 'etude_faisabilite')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const update = async (quote: Devis, status: string) => {
    setBusy(true); setMessage('')
    try { await api.patch(`/devis/${quote.id}`, { statut: status }); await onChanged() } catch { setMessage('Impossible de modifier cette offre.') } finally { setBusy(false) }
  }
  const totalHt = quotes.reduce((sum, quote) => sum + Number(quote.montant_ht ?? 0), 0)
  const totalTtc = quotes.reduce((sum, quote) => sum + Number(quote.montant_ttc ?? 0), 0)
  return <div className="mt-5"><Section title={`Comparatif initial · ${quotes.length} offre(s)`} icon={Scale}>{quotes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-400"><th className="px-2 py-3">Lot</th><th className="px-2 py-3">Artisan</th><th className="px-2 py-3 text-right">HT</th><th className="px-2 py-3 text-right">TTC</th><th className="px-2 py-3">Décision</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id} className="border-b border-slate-100"><td className="px-2 py-3 font-medium">{quote.lot_reference?.nom ?? quote.lot ?? 'Sans lot'}</td><td className="px-2 py-3">{quote.partenaire?.nom_entreprise ?? quote.partenaire_nom ?? 'Non renseigné'}</td><td className="px-2 py-3 text-right">{money(quote.montant_ht)}</td><td className="px-2 py-3 text-right font-semibold">{money(quote.montant_ttc)}</td><td className="px-2 py-3"><select disabled={busy} value={quote.statut} onChange={(event) => update(quote, event.target.value)} className="rounded-lg border border-slate-200 px-2 py-1"><option value="en_attente">En attente</option><option value="recu">Reçue</option><option value="valide">Retenue</option><option value="refuse">Non retenue</option></select></td></tr>)}</tbody><tfoot><tr className="font-bold"><td className="px-2 py-3" colSpan={2}>Total des offres</td><td className="px-2 py-3 text-right">{money(totalHt)}</td><td className="px-2 py-3 text-right">{money(totalTtc)}</td><td /></tr></tfoot></table></div> : <Empty text="Aucune offre artisan à comparer." />}<ActionMessage text={message} /><SaveButton label="Enregistrer le comparatif" onClick={() => onSave({ status: activeStatus(trackingStep), data: { offer_count: quotes.length, total_ht: totalHt, total_ttc: totalTtc } })} /></Section></div>
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 p-4"><div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-4 w-4" /></span><h3 className="text-xs font-bold uppercase tracking-[.08em] text-slate-700">{title}</h3></div>{children}</section> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}{children}</label> }
function Info({ label, value: text }: { label: string; value: string }) { return <div className="mb-3 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-700">{text}</p></div> }
function SaveButton({ onClick, label = 'Enregistrer' }: { onClick: () => void; label?: string }) { return <button type="button" onClick={onClick} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Save className="h-4 w-4" />{label}</button> }
function ActionMessage({ text }: { text: string }) { return text ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{text}</p> : null }
function DocumentItem({ document }: { document: Document }) { const done = completeStatuses.includes(document.workflow_status); return <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3"><FileText className="h-4 w-4 text-blue-500" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{document.nom}</p><p className="mt-0.5 text-[11px] text-slate-400">{document.workflow_status.replaceAll('_', ' ')}</p></div>{done && <Check className="h-4 w-4 text-emerald-500" />}</div> }
function QuoteRow({ quote, action }: { quote: Devis; action?: React.ReactNode }) { return <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><p className="text-xs font-semibold">{quote.lot_reference?.nom ?? quote.lot ?? quote.partenaire?.nom_entreprise ?? quote.partenaire_nom ?? `Devis n°${quote.id}`}</p><p className="mt-1 text-[11px] text-slate-400">{money(quote.montant_ttc)} · {quote.statut.replaceAll('_', ' ')}</p></div>{action}</div> }
function ProjectLink({ project, label }: { project: Projet; label: string }) { return <Link to={`/projets/${project.id}`} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700">{label} →</Link> }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400">{text}</p> }
const money = (amount?: number) => amount === undefined || amount === null ? '—' : `${Number(amount).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`
