import { useState } from 'react'
import { AlertTriangle, CalendarDays, CircleHelp, Clock3, FileClock, Lightbulb, Plus } from 'lucide-react'
import api from '@/lib/api'
import type { AssistantItem, Document, Projet, WorkloadBlock } from '@/types'

const done = ['valide', 'signe', 'archive']
const owner = (document: Document, projects: Projet[]) => projects.find((project) => project.id === document.projet_id)?.nom ?? 'Projet'
interface AssistantData { assistant_items: AssistantItem[]; time_minutes: number; workload: WorkloadBlock[] }

export default function AssistantOverview({ projects, assistant, onChanged }: { projects: Projet[]; assistant: AssistantData; onChanged: () => Promise<unknown> | void }) {
  const [busy, setBusy] = useState(false)
  const documents = projects.flatMap((project) => project.documents ?? [])
  const now = Date.now()
  const late = documents.filter((item) => item.due_at && new Date(item.due_at).getTime() < now && !done.includes(item.workflow_status))
  const upcoming = documents.filter((item) => item.due_at && new Date(item.due_at).getTime() >= now && new Date(item.due_at).getTime() <= now + 7 * 86_400_000 && !done.includes(item.workflow_status))
  const inactive = projects.filter((project) => project.updated_at && now - new Date(project.updated_at).getTime() > 30 * 86_400_000)
  const items = assistant.assistant_items ?? []
  const act = async (id: number, status: string) => { setBusy(true); try { await api.patch(`/assistant/items/${id}`, { status, postponed_until: status === 'reporte' ? new Date(Date.now() + 86_400_000).toISOString() : undefined }); await onChanged() } finally { setBusy(false) } }
  const addItem = async () => { const title = window.prompt('Titre de la nouvelle décision ou suggestion :')?.trim(); if (!title) return; await api.post('/assistant/items', { type: 'decision', title }); await onChanged() }
  const addTime = async () => { const project = projects[0]; if (!project) return; const minutes = Number(window.prompt(`Temps passé sur « ${project.nom} » (minutes) :`) ?? 0); if (minutes > 0) { await api.post(`/projets/${project.id}/time-entries`, { action: 'Suivi du dossier', minutes }); await onChanged() } }
  const addWorkload = async () => { const title = window.prompt('Titre du créneau de charge :')?.trim(); if (!title) return; const starts = new Date(Date.now() + 3_600_000); await api.post('/assistant/workload-blocks', { title, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 3_600_000).toISOString(), projet_id: projects[0]?.id }); await onChanged() }
  const cards = [
    { title: 'Urgences', icon: AlertTriangle, tone: 'bg-red-50 text-red-600', items: [...late.map((item) => ({ id: 0, name: item.nom, detail: owner(item, projects) })), ...items.filter((i) => i.type === 'urgence').map(mapItem)], empty: 'Aucune échéance dépassée' },
    { title: 'Agenda', icon: CalendarDays, tone: 'bg-blue-50 text-blue-600', items: upcoming.map((item) => ({ id: 0, name: item.nom, detail: new Date(item.due_at!).toLocaleDateString('fr-FR') })), empty: 'Aucune échéance cette semaine' },
    { title: 'Décisions', icon: CircleHelp, tone: 'bg-amber-50 text-amber-600', items: items.filter((i) => i.type === 'decision').map(mapItem), empty: 'Aucun arbitrage nécessaire' },
    { title: 'Suggestions', icon: Lightbulb, tone: 'bg-emerald-50 text-emerald-600', items: [...items.filter((i) => i.type === 'suggestion').map(mapItem), ...inactive.map((p) => ({ id: 0, name: p.nom, detail: 'Dossier inactif à vérifier' }))], empty: 'Aucune suggestion actuellement' },
    { title: 'Mails', icon: FileClock, tone: 'bg-cyan-50 text-cyan-600', items: items.filter((i) => i.type === 'mail').map(mapItem), empty: 'Aucun mail à répondre' },
  ]
  return <><section aria-label="Assistant MOE" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{cards.map(({ title, icon: Icon, tone, items: cardItems, empty }) => <article key={title} className="min-h-36 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span><h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{title}</h2></div><div className="mt-3 space-y-2">{cardItems.length ? cardItems.slice(0, 3).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2"><p className="truncate text-xs font-semibold">{item.name}</p><p className="text-[11px] text-slate-500">{item.detail}</p>{item.id > 0 && <div className="mt-2 flex gap-2"><button disabled={busy} onClick={() => void act(item.id, title === 'Mails' ? 'repondu' : 'termine')} className="text-[10px] font-bold text-emerald-600">Traité</button><button disabled={busy} onClick={() => void act(item.id, 'reporte')} className="text-[10px] font-bold text-amber-600">Reporter</button><button disabled={busy} onClick={() => void act(item.id, 'ignore')} className="text-[10px] font-bold text-slate-400">Ignorer</button></div>}</div>) : <p className="pt-3 text-xs text-slate-400">{empty}</p>}</div></article>)}</section><div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs"><button onClick={() => void addItem()} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white"><Plus className="h-3.5 w-3.5" />Décision</button><button onClick={() => void addTime()} className="rounded-lg border px-3 py-2 font-semibold"><Clock3 className="mr-1 inline h-3.5 w-3.5" />Temps : {assistant.time_minutes ?? 0} min cette semaine</button><button onClick={() => void addWorkload()} className="rounded-lg border px-3 py-2 font-semibold">Charge : {assistant.workload?.length ?? 0} créneau(x)</button></div></>
}

const mapItem = (item: AssistantItem) => ({ id: item.id, name: item.title, detail: item.projet?.nom ?? item.details ?? 'Action MOE' })
