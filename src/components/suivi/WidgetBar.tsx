import { AlertTriangle, Calendar, Lightbulb, ListChecks, Mail, RefreshCw, Timer } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The five-widget bar of the "Suivi Chantier" prototype (annotations §2).
 *
 * Content is deliberately static: URGENCE / AGENDA / DÉCISIONS / SUGGESTIONS /
 * MAILS have no API behind them yet (they belong to the assistant layer
 * described in Pimoo_API_Spec_Complete.pdf). This renders the layout and the
 * interaction vocabulary so the shape can be reviewed before we build it.
 */

const URGENCES = [
  { dossier: 'MAISON JARVIS TEST', devis: '0/8 devis reçus', alerte: 'délai dépassé' },
  { dossier: 'MAISON AUBERT', devis: '0/8 devis reçus', alerte: 'délai dépassé' },
  { dossier: 'MAISON BRUNET', devis: '3/4 devis reçus', alerte: 'délai dépassé' },
]

const DECISIONS = [
  'Demande de chiffrage — MAISON AUBERT · Lot 1',
  'Demande de chiffrage — MAISON ALBERT · Lot 3',
]

const SUGGESTIONS = [
  'MAISON LEROY : attestation décennale de LE TRIANGLE DE L\'ART a expiré',
  'MAISON AUBERT : dossier ESQ inactif depuis 1288j — relancer ou archiver ?',
]

const MAIL_TAGS = ['Pro 48h', 'Perso', 'Immo', 'Fonctionnel', 'Autre']

function Widget({ title, icon, accent, action, children }: { title: string; icon: ReactNode; accent: string; action?: ReactNode; children: ReactNode }) {
  return <article className="flex h-56 min-w-0 flex-col rounded-xl border border-slate-200 bg-white">
    <header className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5">
      <span className={accent}>{icon}</span>
      <h2 className={`text-[11px] font-bold uppercase tracking-[0.12em] ${accent}`}>{title}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </header>
    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">{children}</div>
  </article>
}

const miniButton = 'rounded border px-1.5 py-0.5 text-[10px] font-semibold'

export default function WidgetBar() {
  return <section aria-label="Indicateurs de pilotage" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
    <Widget title="Urgence" accent="text-red-600" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
      {URGENCES.map((item) => <div key={item.dossier} className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900">{item.dossier}</p>
          <p className="truncate text-[11px] text-slate-500">{item.devis} · <span className="font-semibold text-red-600">{item.alerte}</span></p>
        </div>
        <button type="button" className="shrink-0 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-100">Relancer</button>
      </div>)}
    </Widget>

    <Widget
      title="Agenda"
      accent="text-blue-600"
      icon={<Calendar className="h-3.5 w-3.5" />}
      action={<button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"><Timer className="h-3 w-3" />Saisir temps</button>}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Aujourd'hui</p>
        <p className="mt-1 text-[13px]"><span className="font-bold text-blue-600">8h</span> <span className="text-slate-600">Travail sur dossiers</span></p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Cette semaine</p>
        <p className="mt-1 text-[13px] font-semibold text-slate-900">18 Aoû 2026 <span className="font-normal text-slate-600">8h30 — RDV chiffrage</span></p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button type="button" className={`${miniButton} border-slate-200 text-slate-500 hover:bg-slate-50`}>Préparer ce RDV</button>
          <button type="button" className={`${miniButton} border-blue-200 text-blue-600 hover:bg-blue-50`}>Bloquer temps</button>
        </div>
      </div>
    </Widget>

    <Widget title="Décisions" accent="text-amber-600" icon={<ListChecks className="h-3.5 w-3.5" />}>
      {DECISIONS.map((item) => <div key={item}>
        <p className="text-[12px] leading-snug text-slate-700">▸ {item}</p>
        <div className="mt-1.5 flex gap-1.5">
          <button type="button" className={`${miniButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}>✓ Faire</button>
          <button type="button" className={`${miniButton} border-slate-200 text-slate-500 hover:bg-slate-50`}>✗ Ignorer</button>
        </div>
      </div>)}
    </Widget>

    <Widget title="Suggestions" accent="text-emerald-600" icon={<Lightbulb className="h-3.5 w-3.5" />}>
      {SUGGESTIONS.map((item) => <div key={item}>
        <p className="text-[12px] leading-snug text-slate-700">▸ {item}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button type="button" className={`${miniButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}>✓ Oui</button>
          <button type="button" className={`${miniButton} border-slate-200 text-slate-500 hover:bg-slate-50`}>↩ Reporter</button>
          <button type="button" className={`${miniButton} border-red-200 text-red-600 hover:bg-red-50`}>✗ Non</button>
        </div>
      </div>)}
    </Widget>

    <Widget
      title="Mails"
      accent="text-violet-600"
      icon={<Mail className="h-3.5 w-3.5" />}
      action={<button type="button" aria-label="Rafraichir" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><RefreshCw className="h-3 w-3" /></button>}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Nouveaux expéditeurs</p>
      <p className="truncate text-[12px] text-slate-700">contact@escaliers-durand.fr — <span className="text-slate-400">2 mails</span></p>
      <div className="flex flex-wrap gap-1.5">
        {MAIL_TAGS.map((tag) => <button key={tag} type="button" className={`${miniButton} border-slate-200 text-slate-500 hover:bg-slate-50`}>{tag}</button>)}
        <button type="button" className={`${miniButton} border-red-200 text-red-500 hover:bg-red-50`}>Ignorer</button>
      </div>
    </Widget>
  </section>
}
