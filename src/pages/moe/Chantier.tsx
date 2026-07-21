import { useQuery } from '@tanstack/react-query'
import { CalendarDays, FileText, HardHat } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Document, PaginatedResponse, Projet } from '@/types'

export default function Chantier() {
  const query = useQuery({ queryKey: ['chantier-view'], queryFn: async () => {
    const [projects, documents] = await Promise.all([api.get<PaginatedResponse<Projet>>('/projets?phase=chantier&limit=100'), api.get<PaginatedResponse<Document>>('/documents?phase=chantier&limit=200')])
    return { projects: projects.data.data, documents: documents.data.data }
  }})
  const data = query.data ?? { projects: [], documents: [] }
  return <>
    <PageHeader title="Suivi chantier" description="Retrouvez les chantiers actifs, comptes rendus, plannings et documents de diffusion." />
    <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-slate-950 p-5 text-white"><HardHat className="mb-4 h-6 w-6 text-blue-300" /><p className="text-3xl font-bold">{data.projects.length}</p><p className="text-sm text-slate-300">Chantiers suivis</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><FileText className="mb-4 h-6 w-6 text-blue-600" /><p className="text-3xl font-bold">{data.documents.length}</p><p className="text-sm text-slate-500">Documents chantier</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><CalendarDays className="mb-4 h-6 w-6 text-amber-600" /><p className="text-3xl font-bold">{data.documents.filter((item) => item.due_at && new Date(item.due_at) >= new Date()).length}</p><p className="text-sm text-slate-500">Echeances a venir</p></div></div>
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><h2 className="font-bold">Chantiers en cours</h2></div><div className="grid gap-4 p-4 lg:grid-cols-2">{data.projects.map((project) => { const projectDocuments = data.documents.filter((document) => document.projet?.id === project.id || document.projet_id === project.id); return <Link key={project.id} to={`/projets/${project.id}`} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm"><div className="flex items-start justify-between"><div><p className="font-semibold">{project.nom}</p><p className="mt-1 text-xs text-slate-400">{project.adresse ?? 'Adresse non renseignee'}</p></div><StatusBadge value={project.statut} /></div><div className="mt-5 flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{projectDocuments.length} document(s)</span><span>{projectDocuments.filter((item) => item.type_document === 'compte_rendu').length} compte(s) rendu(s)</span></div></Link> })}{!query.isLoading && data.projects.length === 0 && <p className="col-span-2 py-10 text-center text-sm text-slate-400">Aucun projet en phase chantier</p>}</div></section>
  </>
}
