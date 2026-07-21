import { useQuery } from '@tanstack/react-query'
import { Archive, CheckCircle2, Download, FileArchive } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Document, PaginatedResponse, Projet } from '@/types'

export default function Cloture() {
  const query = useQuery({ queryKey: ['closure-view'], queryFn: async () => {
    const [projects, documents] = await Promise.all([api.get<PaginatedResponse<Projet>>('/projets?phase=cloture&limit=100'), api.get<PaginatedResponse<Document>>('/documents?phase=cloture&limit=200')])
    return { projects: projects.data.data, documents: documents.data.data }
  }})
  const data = query.data ?? { projects: [], documents: [] }
  return <>
    <PageHeader title="Cloture & archives" description="Controlez les pieces de fin de chantier, DOE et archives de projet." />
    <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><Archive className="mb-4 h-6 w-6 text-violet-600" /><p className="text-3xl font-bold">{data.projects.length}</p><p className="text-sm text-slate-500">Projets en cloture</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><CheckCircle2 className="mb-4 h-6 w-6 text-emerald-600" /><p className="text-3xl font-bold">{data.documents.filter((item) => ['valide', 'archive'].includes(item.workflow_status)).length}</p><p className="text-sm text-slate-500">Pieces conformes</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><FileArchive className="mb-4 h-6 w-6 text-blue-600" /><p className="text-3xl font-bold">{data.documents.filter((item) => item.document_type?.code === 'DOE').length}</p><p className="text-sm text-slate-500">DOE suivis</p></div></div>
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><h2 className="font-bold">Dossiers de cloture</h2></div><div className="divide-y divide-slate-100">{data.projects.map((project) => { const docs = data.documents.filter((item) => item.projet?.id === project.id || item.projet_id === project.id); const complete = docs.filter((item) => ['valide', 'archive'].includes(item.workflow_status)).length; return <Link to={`/projets/${project.id}`} key={project.id} className="flex flex-wrap items-center gap-4 p-5 hover:bg-slate-50"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50"><FileArchive className="h-5 w-5 text-violet-600" /></div><div className="min-w-48 flex-1"><p className="font-semibold">{project.nom}</p><p className="text-xs text-slate-400">{complete}/{docs.length} pieces conformes</p></div><div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${docs.length ? (complete / docs.length) * 100 : 0}%` }} /></div><StatusBadge value={project.statut} /><Download className="h-4 w-4 text-slate-300" /></Link>})}{!query.isLoading && data.projects.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Aucun projet en phase cloture</p>}</div></section>
  </>
}
