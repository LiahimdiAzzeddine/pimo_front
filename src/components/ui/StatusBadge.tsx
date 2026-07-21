const colors: Record<string, string> = {
  actif: 'bg-emerald-50 text-emerald-700', valide: 'bg-emerald-50 text-emerald-700', payee: 'bg-emerald-50 text-emerald-700', envoyee: 'bg-blue-50 text-blue-700', recu: 'bg-blue-50 text-blue-700', en_cours: 'bg-blue-50 text-blue-700',
  en_attente: 'bg-amber-50 text-amber-700', programmee: 'bg-amber-50 text-amber-700', brouillon: 'bg-slate-100 text-slate-600', a_faire: 'bg-slate-100 text-slate-600', termine: 'bg-slate-100 text-slate-600',
  refuse: 'bg-red-50 text-red-700', echouee: 'bg-red-50 text-red-700', annulee: 'bg-red-50 text-red-700', en_pause: 'bg-orange-50 text-orange-700',
}

export default function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[value] ?? 'bg-slate-100 text-slate-600'}`}>{value.replaceAll('_', ' ')}</span>
}
