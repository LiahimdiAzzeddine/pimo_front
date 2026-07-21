import { AlertTriangle, Bell, CheckCircle2, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Document, Relance } from '@/types'

export interface AlertData {
  stats: { scheduled_reminders: number; deadlines_at_risk: number }
  alerts: { reminders: Relance[]; documents: Document[] }
}

export default function NotificationPanel({ data, loading, onClose }: { data?: AlertData; loading: boolean; onClose: () => void }) {
  const count = (data?.alerts.reminders.length ?? 0) + (data?.alerts.documents.length ?? 0)
  return <div className="absolute right-0 top-12 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
    <header className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-bold">Centre d alertes</h2><p className="text-xs text-slate-400">{count} element(s) a surveiller</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50"><Bell className="h-4 w-4 text-amber-600" /></div></header>
    <div className="max-h-[60vh] overflow-y-auto p-3">{loading ? <p className="py-10 text-center text-sm text-slate-400">Chargement...</p> : count === 0 ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-2 text-sm font-medium">Tout est sous controle</p></div> : <div className="space-y-2">
      {data?.alerts.reminders.map((item) => <Link key={`r-${item.id}`} to="/relances" onClick={onClose} className="flex gap-3 rounded-xl bg-amber-50 p-3 hover:bg-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-amber-950">{item.objet ?? 'Relance programmee'}</p><p className="truncate text-xs text-amber-700">{item.destinataire_email}</p></div></Link>)}
      {data?.alerts.documents.map((item) => <Link key={`d-${item.id}`} to={`/projets/${item.projet_id}`} onClick={onClose} className="flex gap-3 rounded-xl bg-blue-50 p-3 hover:bg-blue-100"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-blue-950">{item.nom}</p><p className="truncate text-xs text-blue-700">{item.workflow_status.replaceAll('_', ' ')}</p></div></Link>)}
    </div>}</div>
    <footer className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100"><Link to="/documents" onClick={onClose} className="bg-white px-4 py-3 text-center text-xs font-semibold text-blue-600 hover:bg-slate-50">Voir les documents</Link><Link to="/relances" onClick={onClose} className="bg-white px-4 py-3 text-center text-xs font-semibold text-blue-600 hover:bg-slate-50">Voir les relances</Link></footer>
  </div>
}
