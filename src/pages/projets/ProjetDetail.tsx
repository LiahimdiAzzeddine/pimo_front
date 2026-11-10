import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CircleCheck, Download, Pencil, RotateCw, Send, Upload } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import ProjectFormModal from '@/components/projects/ProjectFormModal'
import PublicLinksPanel from '@/components/projects/PublicLinksPanel'
import { isLocalApp } from '@/lib/api'
import type { ProjectPayload } from '@/components/projects/ProjectFormModal'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Client, Document, PaginatedResponse, Projet } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', envoye: 'Envoyé', en_attente_signature: 'Signature attendue',
  en_attente_validation: 'Validation attendue', signe: 'Signé', valide: 'Validé',
  rejete: 'Rejeté', archive: 'Archivé',
}

const NEXT_ACTION: Record<string, { status: string; label: string }> = {
  brouillon: { status: 'envoye', label: 'Envoyer' },
  envoye: { status: 'en_attente_validation', label: 'Demander validation' },
  en_attente_signature: { status: 'signe', label: 'Marquer signé' },
  en_attente_validation: { status: 'valide', label: 'Valider' },
  signe: { status: 'archive', label: 'Archiver' },
  valide: { status: 'archive', label: 'Archiver' },
  rejete: { status: 'brouillon', label: 'Réouvrir' },
}

const BACK_ACTION: Record<string, { status: string; label: string }> = {
  envoye: { status: 'brouillon', label: 'Retour brouillon' },
  en_attente_signature: { status: 'envoye', label: 'Retour envoye' },
  en_attente_validation: { status: 'envoye', label: 'Retour envoye' },
  signe: { status: 'en_attente_signature', label: 'Annuler signature' },
  valide: { status: 'en_attente_validation', label: 'Annuler validation' },
  archive: { status: 'valide', label: 'Desarchiver' },
}

const PROJECT_PHASES = [
  { value: 'etude_faisabilite', label: 'Étude' }, { value: 'consultation_entreprises', label: 'Consultation' },
  { value: 'analyse_offres', label: 'Analyse' }, { value: 'chantier', label: 'Chantier' }, { value: 'cloture', label: 'Clôture' },
]

function DocumentCard({ document, project, onChanged, onError }: { document: Document; project: Projet; onChanged: () => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [fileBusy, setFileBusy] = useState(false)
  const type = document.document_type
  const applicability = type?.applicabilities?.[0]?.applicability
  const configuredSteps = type?.workflow_config ?? []
  const defaultAction = NEXT_ACTION[document.workflow_status]
  const action = document.workflow_status === 'envoye' && type?.nature === 'signature'
    ? { status: 'en_attente_signature', label: 'Demander signature' }
    : defaultAction
  const backAction = document.workflow_status === 'archive' && type?.nature === 'signature'
    ? { status: 'signe', label: 'Desarchiver' }
    : BACK_ACTION[document.workflow_status]
  const recipients = recipientsFor(document, project)

  const transition = async (status: string) => {
    setBusy(true)
    try {
      const { data } = await api.post<Document & { notification?: { message?: string } }>(`/documents/${document.id}/transition`, { status })
      onError(data.notification?.message ?? '')
      onChanged()
    } catch {
      onError(`Impossible de mettre à jour le document "${document.nom}".`)
    } finally {
      setBusy(false)
    }
  }

  const uploadFile = async (file?: File) => {
    if (!file) return
    setFileBusy(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await api.post(`/documents/${document.id}/file`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      onError('')
      await onChanged()
    } catch {
      onError(`Impossible de déposer le fichier pour "${document.nom}". Formats acceptés : PDF, JPEG ou PNG (10 Mo maximum).`)
    } finally {
      setFileBusy(false)
    }
  }

  const downloadFile = async () => {
    setFileBusy(true)
    try {
      const response = await api.get<Blob>(`/documents/${document.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = document.original_file_name ?? document.nom
      anchor.click()
      URL.revokeObjectURL(url)
      onError('')
    } catch {
      onError(`Impossible de télécharger le fichier "${document.nom}".`)
    } finally {
      setFileBusy(false)
    }
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{type?.libelle ?? document.nom}</h3>
            {applicability && <span className={`rounded px-2 py-0.5 text-xs ${applicability === 'optionnel' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{applicability === 'optionnel' ? 'Optionnel' : 'Obligatoire'}</span>}
            {type?.exclusive_group && <span className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">Choix: {type.exclusive_group}</span>}
          </div>
          <p className="mt-1 text-xs text-gray-500">{type?.code} · {type?.nature} · Émetteur: {type?.emetteur_role ?? 'non défini'}</p>
          <p className="mt-1 max-w-xl text-xs text-gray-400">Destinataire(s) : {recipients.length ? recipients.map((recipient) => `${recipient.name}${recipient.email ? ` <${recipient.email}>` : ' - email manquant'}`).join(', ') : 'Aucun destinataire configuré'}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{STATUS_LABELS[document.workflow_status] ?? document.workflow_status}</span>
      </div>

      <div className="mt-5 flex overflow-x-auto pb-2">
        {configuredSteps.map((step, index) => {
          const currentIndex = configuredSteps.findIndex((item) => item.status === document.workflow_status)
          const done = index <= currentIndex
          return (
            <div key={`${step.status}-${index}`} className="flex min-w-28 flex-1 items-center last:flex-none">
              <div className="text-center">
                <div className={`mx-auto h-3 w-3 rounded-full ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <p className="mt-1 text-[11px] text-gray-600">{STATUS_LABELS[step.status] ?? step.status}</p>
                <p className="text-[10px] text-gray-400">{step.actor}</p>
              </div>
              {index < configuredSteps.length - 1 && <div className={`mx-2 h-px min-w-8 flex-1 ${index < currentIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div><p className="text-xs text-gray-500">{document.due_at ? `Échéance: ${new Date(document.due_at).toLocaleDateString('fr-FR')}` : 'Sans échéance'}</p>{document.file_path && <p className="mt-1 text-[11px] text-gray-400">{document.original_file_name ?? 'Fichier joint'} - v{document.version ?? 1}{document.file_size ? ` - ${(document.file_size / 1024).toFixed(0)} Ko` : ''}</p>}</div>
        <div className="flex flex-wrap justify-end gap-2">
          {document.file_path && <button type="button" disabled={fileBusy} onClick={downloadFile} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Download className="h-4 w-4" />Télécharger</button>}
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 ${fileBusy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" />{fileBusy ? 'Transfert...' : document.file_path ? 'Remplacer' : 'Déposer'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => { uploadFile(event.target.files?.[0]); event.target.value = '' }} /></label>
          {backAction && <button disabled={busy} onClick={() => transition(backAction.status)} className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">{busy ? 'Traitement...' : backAction.label}</button>}
          {action && <button disabled={busy} onClick={() => transition(action.status)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Traitement...' : action.label}</button>}
        </div>
      </div>
    </article>
  )
}

function recipientsFor(document: Document, project: Projet) {
  const roles = document.document_type?.destinataire_roles ?? []
  const recipients: { name: string; email?: string }[] = []

  if (roles.includes('client') && project.client) {
    recipients.push({
      name: `${project.client.prenom ?? ''} ${project.client.nom}`.trim() || 'Client',
      email: project.client.email,
    })
  }

  if (roles.includes('artisan')) {
    const partners = document.partenaire ? [document.partenaire] : (project.partenaires ?? [])
    partners.forEach((partner) => recipients.push({
      name: partner.nom_entreprise,
      email: partner.email,
    }))
  }

  return recipients
}

export default function ProjetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [projet, setProjet] = useState<Projet | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [transitionError, setTransitionError] = useState('')
  const [checklistPhase, setChecklistPhase] = useState('all')
  const [checklistStatus, setChecklistStatus] = useState('all')
  const clients = useQuery({ queryKey: ['project-clients'], queryFn: async () => (await api.get<PaginatedResponse<Client>>('/clients?limit=200')).data.data })

  const load = useCallback(async () => {
    setLoadError('')
    const [projectResponse, checklistResponse] = await Promise.all([
      api.get<Projet>(`/projets/${id}`),
      api.get<{ data: Document[] }>(`/projets/${id}/checklist`),
    ])
    setProjet(projectResponse.data)
    setDocuments(checklistResponse.data.data)
  }, [id])

  useEffect(() => {
    load().catch(() => setLoadError('Impossible de charger le projet et sa checklist.')).finally(() => setLoading(false))
  }, [load])

  const updateProject = async (payload: ProjectPayload) => {
    if (!projet) return
    setSaving(true)
    setFormError('')
    try {
      await api.patch(`/projets/${projet.id}`, payload)
      await load()
      setEditing(false)
    } catch (error) {
      setFormError(apiErrorMessage(error, 'Impossible de modifier le projet. Vérifiez les informations, les dates et les prérequis de phase.'))
    } finally {
      setSaving(false)
    }
  }

  const quickUpdate = async (payload: Partial<Projet>) => {
    if (!projet) return
    setSaving(true)
    setTransitionError('')
    try {
      await api.patch(`/projets/${projet.id}`, payload)
      await load()
    } catch (error) {
      setTransitionError(apiErrorMessage(error, 'Impossible de mettre à jour le projet. Vérifiez les objectifs de phase.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-gray-400">Chargement...</div>
  if (loadError && !projet) return <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-red-500" /><p className="mt-3 text-sm font-semibold text-red-800">{loadError}</p><div className="mt-5 flex justify-center gap-2"><button onClick={() => navigate('/projets')} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">Retour</button><button onClick={() => { setLoading(true); load().finally(() => setLoading(false)) }} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"><RotateCw className="h-4 w-4" />Réessayer</button></div></div>
  if (!projet) return null

  const completedStatuses = ['valide', 'signe', 'archive']
  const completedCount = documents.filter((document) => completedStatuses.includes(document.workflow_status)).length
  const progress = documents.length ? Math.round((completedCount / documents.length) * 100) : 0
  const checklistSummary = documents.reduce((summary, document) => {
    const isRequired = document.document_type?.applicabilities?.[0]?.applicability === 'obligatoire'
    const isDone = completedStatuses.includes(document.workflow_status)
    const isRejected = document.workflow_status === 'rejete' || document.statut === 'refuse'
    const isLate = Boolean(document.due_at && new Date(document.due_at) < new Date() && !isDone)

    if (isRequired) {
      summary.required += 1
      if (isDone) summary.requiredDone += 1
      if (!isDone) summary.missing += 1
    }
    if (isLate) summary.late += 1
    if (isRejected) summary.rejected += 1

    return summary
  }, { required: 0, requiredDone: 0, missing: 0, late: 0, rejected: 0 })
  const phaseProgress = projet.phase_progress ?? 0
  const phaseAlerts = projet.phase_alerts ?? []
  const phaseChecks = projet.phase_checks_summary ?? []
  const filteredDocuments = documents.filter((document) => {
    const phaseMatches = checklistPhase === 'all' || document.phase === checklistPhase
    const statusMatches = checklistStatus === 'all'
      || (checklistStatus === 'termine' ? completedStatuses.includes(document.workflow_status) : !completedStatuses.includes(document.workflow_status))
    return phaseMatches && statusMatches
  })
  const groupedDocuments = filteredDocuments.reduce<Record<string, Document[]>>((groups, document) => {
    const phase = document.phase ?? 'sans_phase'
    groups[phase] = [...(groups[phase] ?? []), document]
    return groups
  }, {})
  const phases = PROJECT_PHASES.map((phase) => [phase.value, groupedDocuments[phase.value] ?? []] as const)
    .filter(([, phaseDocuments]) => phaseDocuments.length > 0)

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
        <button aria-label="Retour aux projets" onClick={() => navigate('/projets')} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900">{projet.nom}</h1>
          <p className="truncate text-xs text-gray-500">{projet.adresse ?? projet.project_type?.replaceAll('_', ' ')}</p>
        </div>
        <StatusBadge value={projet.statut} />
        <select disabled={saving} value={projet.statut} onChange={(event) => quickUpdate({ statut: event.target.value })} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="actif">Actif</option><option value="en_pause">En pause</option><option value="termine">Terminé</option></select>
        <button onClick={() => navigate(`/consultation?projet=${projet.id}`)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Send className="h-4 w-4" />Consultation</button>
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"><Pencil className="h-4 w-4" />Modifier</button>
      </header>

      <main className="space-y-8">
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-5"><div className="flex min-w-[650px] items-center">{PROJECT_PHASES.map((phase, index) => { const currentIndex = PROJECT_PHASES.findIndex((item) => item.value === projet.phase); const active = index <= currentIndex; return <div key={phase.value} className="flex flex-1 items-center last:flex-none"><button disabled={saving} onClick={() => quickUpdate({ phase: phase.value })} className="group text-center"><div className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${phase.value === projet.phase ? 'bg-blue-600 text-white ring-4 ring-blue-100' : active ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>{index + 1}</div><p className={`mt-2 text-xs font-medium ${phase.value === projet.phase ? 'text-blue-700' : 'text-gray-500'}`}>{phase.label}</p></button>{index < PROJECT_PHASES.length - 1 && <div className={`mx-3 h-0.5 flex-1 ${index < currentIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />}</div> })}</div></section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phase actuelle</p><h2 className="text-lg font-bold text-gray-900">{projet.phase_label ?? projet.phase.replaceAll('_', ' ')}</h2></div>
            <div className="text-right"><p className="text-2xl font-bold text-gray-900">{phaseProgress} %</p><p className="text-xs text-gray-400">avancement métier</p></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${phaseProgress}%` }} /></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {phaseChecks.map((check) => <div key={check.label} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${check.done ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
              {check.done ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
              <div><p className="font-medium">{check.label}</p>{!check.done && <p className="mt-0.5 text-xs">{check.alert}</p>}</div>
            </div>)}
          </div>
          {phaseAlerts.length > 0 && <div className="mt-5 space-y-2">{phaseAlerts.map((alert) => <div key={alert} className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{alert}</div>)}</div>}
        </section>

        <section className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-4">
          <div><p className="text-xs text-gray-500">Statut</p><p className="font-medium">{projet.statut}</p></div>
          <div><p className="text-xs text-gray-500">Documents</p><p className="font-medium">{documents.length}</p></div>
          <div><p className="text-xs text-gray-500">Terminés</p><p className="font-medium">{completedCount} ({progress} %)</p></div>
          <div><p className="text-xs text-gray-500">Budget</p><p className="font-medium">{projet.budget_estimatif ? `${Number(projet.budget_estimatif).toLocaleString('fr-FR')} EUR` : '-'}</p></div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Maître d’ouvrage</p>
            {projet.client ? <div className="mt-3"><p className="font-semibold text-gray-900">{projet.client.prenom} {projet.client.nom}</p><p className="text-sm text-gray-500">{projet.client.email ?? 'Email non renseigné'}</p><p className="text-sm text-gray-500">{projet.client.telephone ?? 'Téléphone non renseigné'}</p></div> : <p className="mt-3 text-sm text-gray-400">Aucun client rattaché</p>}
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Équipe projet</p><span className="text-xs text-gray-400">{projet.partenaires?.length ?? 0} partenaire(s)</span></div>
            <div className="mt-3 flex flex-wrap gap-2">{projet.partenaires?.map((partner) => <span key={partner.id} className="rounded-lg bg-gray-100 px-3 py-2 text-sm"><strong>{partner.nom_entreprise}</strong>{partner.activite && <span className="ml-1 text-gray-400">· {partner.activite}</span>}</span>)}{!projet.partenaires?.length && <p className="text-sm text-gray-400">Aucun partenaire rattaché</p>}</div>
          </article>
        </section>

        {isLocalApp ? <section className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800"><strong>Mode local</strong><p className="mt-1">Les liens publics et les invitations par e-mail nécessitent un service en ligne. Toutes les autres données de ce projet restent stockées sur cet appareil.</p></section> : <PublicLinksPanel project={projet} documents={documents} onProjectChanged={load} />}

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-lg font-bold text-gray-900">Checklist documentaire</h2><p className="text-xs text-gray-500">Documents applicables au type {projet.project_type?.replaceAll('_', ' ')}</p></div>
            <div className="text-right"><p className="text-sm font-bold text-gray-900">{completedCount}/{documents.length}</p><p className="text-xs text-gray-400">documents terminés</p></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-800">{checklistSummary.requiredDone}/{checklistSummary.required}</p>
              <p className="text-xs font-medium text-emerald-700">Obligatoires OK</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-bold text-slate-800">{checklistSummary.missing}</p>
              <p className="text-xs font-medium text-slate-600">Obligatoires manquants</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-2xl font-bold text-amber-800">{checklistSummary.late}</p>
              <p className="text-xs font-medium text-amber-700">Documents en retard</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-800">{checklistSummary.rejected}</p>
              <p className="text-xs font-medium text-red-700">Documents refusés</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setChecklistPhase('all')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${checklistPhase === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Toutes les phases</button>
            {PROJECT_PHASES.map((phase) => <button key={phase.value} onClick={() => setChecklistPhase(phase.value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${checklistPhase === phase.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{phase.label} ({documents.filter((document) => document.phase === phase.value).length})</button>)}
          </div>
          <div className="mt-3 flex gap-2">
            {[{ value: 'all', label: 'Tous' }, { value: 'a_traiter', label: 'À traiter' }, { value: 'termine', label: 'Terminés' }].map((item) => <button key={item.value} onClick={() => setChecklistStatus(item.value)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${checklistStatus === item.value ? 'border-slate-700 bg-slate-700 text-white' : 'border-gray-200 text-gray-500'}`}>{item.label}</button>)}
          </div>
          {transitionError && <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" />{transitionError}</div>}
        </section>

        {phases.map(([phase, phaseDocuments]) => (
          <section key={phase}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{PROJECT_PHASES.find((item) => item.value === phase)?.label ?? phase.replaceAll('_', ' ')}</h2>
              <span className="text-xs text-gray-500">{phaseDocuments?.length ?? 0} document(s)</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {phaseDocuments.map((document) => <DocumentCard key={document.id} document={document} project={projet} onChanged={load} onError={setTransitionError} />)}
            </div>
          </section>
        ))}
        {phases.length === 0 && <section className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center"><CircleCheck className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-2 text-sm font-medium text-gray-700">Aucun document ne correspond aux filtres.</p><button onClick={() => { setChecklistPhase('all'); setChecklistStatus('all') }} className="mt-3 text-sm font-semibold text-blue-600">Réinitialiser les filtres</button></section>}
      </main>
      <ProjectFormModal open={editing} project={projet} clients={clients.data ?? []} busy={saving} error={formError} onSubmit={updateProject} onClose={() => { setEditing(false); setFormError('') }} />
    </div>
  )
}
