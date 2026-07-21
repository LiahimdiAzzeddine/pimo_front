import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, FileText, Search, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import type { Client, Document, PaginatedResponse, Projet } from '@/types'

type SearchResult = { id: string; title: string; subtitle: string; href: string; type: 'Projet' | 'Client' | 'Document' }

const icons = { Projet: BriefcaseBusiness, Client: UserRound, Document: FileText }

export default function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [term, setTerm] = useState('')
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['global-search-data'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const [projects, clients, documents] = await Promise.all([
        api.get<PaginatedResponse<Projet>>('/projets?limit=100'),
        api.get<PaginatedResponse<Client>>('/clients?limit=100'),
        api.get<PaginatedResponse<Document>>('/documents?limit=200'),
      ])
      return { projects: projects.data.data, clients: clients.data.data, documents: documents.data.data }
    },
  })

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); onOpenChange(!open) }
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [onOpenChange, open])

  const results = useMemo<SearchResult[]>(() => {
    const value = term.trim().toLowerCase()
    if (!value || !query.data) return []
    const projects = query.data.projects.filter((item) => `${item.nom} ${item.adresse ?? ''}`.toLowerCase().includes(value)).map((item) => ({ id: `project-${item.id}`, title: item.nom, subtitle: item.adresse ?? item.phase.replaceAll('_', ' '), href: `/projets/${item.id}`, type: 'Projet' as const }))
    const clients = query.data.clients.filter((item) => `${item.prenom ?? ''} ${item.nom} ${item.email ?? ''}`.toLowerCase().includes(value)).map((item) => ({ id: `client-${item.id}`, title: `${item.prenom ?? ''} ${item.nom}`.trim(), subtitle: item.email ?? 'Client', href: '/clients', type: 'Client' as const }))
    const documents = query.data.documents.filter((item) => `${item.nom} ${item.projet?.nom ?? ''}`.toLowerCase().includes(value)).map((item) => ({ id: `document-${item.id}`, title: item.nom, subtitle: item.projet?.nom ?? item.phase?.replaceAll('_', ' ') ?? 'Document', href: item.projet_id ? `/projets/${item.projet_id}` : '/documents', type: 'Document' as const }))
    return [...projects, ...clients, ...documents].slice(0, 12)
  }, [query.data, term])

  const select = (result: SearchResult) => { navigate(result.href); setTerm(''); onOpenChange(false) }
  if (!open) return null

  return <div className="fixed inset-0 z-[70] flex justify-center bg-slate-950/45 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={() => onOpenChange(false)}>
    <section role="dialog" aria-modal="true" aria-label="Recherche globale" className="h-fit w-full max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-5"><Search className="h-5 w-5 text-slate-400" /><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Rechercher un projet, un client ou un document..." className="h-16 min-w-0 flex-1 border-0 text-base outline-none" /><button onClick={() => onOpenChange(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="max-h-[55vh] overflow-y-auto p-2">
        {!term && <div className="px-4 py-10 text-center"><Search className="mx-auto h-8 w-8 text-slate-200" /><p className="mt-3 text-sm text-slate-400">Saisissez au moins quelques lettres pour commencer.</p></div>}
        {term && query.isLoading && <p className="px-4 py-10 text-center text-sm text-slate-400">Recherche...</p>}
        {term && !query.isLoading && results.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">Aucun resultat pour « {term} »</p>}
        {results.map((result) => { const Icon = icons[result.type]; return <button key={result.id} onClick={() => select(result)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100"><Icon className="h-5 w-5 text-slate-500" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{result.title}</p><p className="truncate text-xs text-slate-400">{result.subtitle}</p></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-500">{result.type}</span></button> })}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-400"><span>{results.length} resultat(s)</span><span><kbd className="rounded border bg-white px-1.5 py-0.5">Esc</kbd> pour fermer</span></footer>
    </section>
  </div>
}
