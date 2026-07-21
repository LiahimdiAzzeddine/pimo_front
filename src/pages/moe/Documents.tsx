import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import ResourcePage from '@/components/resources/ResourcePage'
import StatusBadge from '@/components/ui/StatusBadge'
import type { Document } from '@/types'
import { useProjectOptions } from '@/hooks/useProjectOptions'

function FileActions({ document }: { document: Document }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true); setError(false)
    const data = new FormData(); data.append('file', file)
    try { await api.post(`/documents/${document.id}/file`, data, { headers: { 'Content-Type': 'multipart/form-data' } }); refresh() }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  const download = async () => {
    setBusy(true); setError(false)
    try {
      const response = await api.get<Blob>(`/documents/${document.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data); const anchor = window.document.createElement('a')
      anchor.href = url; anchor.download = document.original_file_name ?? document.nom; anchor.click(); URL.revokeObjectURL(url)
    } catch { setError(true) }
    finally { setBusy(false) }
  }

  return <div className="flex items-center justify-end gap-1">{error && <span title="Operation impossible" className="text-xs font-bold text-red-500">!</span>}{document.file_path && <button disabled={busy} onClick={download} title="Telecharger" className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"><Download className="h-4 w-4" /></button>}<label title={document.file_path ? 'Remplacer le fichier' : 'Deposer un fichier'} className={`cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 ${busy ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-4 w-4" /><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.target.value = '' }} /></label></div>
}

export default function Documents() {
  const projects = useProjectOptions()
  return <ResourcePage<Document & { [key: string]: unknown }> endpoint="/documents" queryKey="documents" title="Documents" description="Suivez tous les documents, validations et signatures de vos projets." createLabel="Nouveau document" fields={[
    { name: 'projet_id', label: 'Projet', type: 'select', options: projects, required: true }, { name: 'nom', label: 'Nom du document', required: true },
    { name: 'type_document', label: 'Type', type: 'select', options: ['plan', 'devis', 'contrat', 'assurance', 'facture', 'photo', 'compte_rendu', 'autre'].map((value) => ({ value, label: value.replaceAll('_', ' ') })) },
    { name: 'phase', label: 'Phase', type: 'select', options: ['etude_faisabilite', 'consultation_entreprises', 'analyse_offres', 'chantier', 'cloture'].map((value) => ({ value, label: value.replaceAll('_', ' ') })) },
  ]} columns={[
    { label: 'Document', render: (item) => <div><p className="font-semibold text-slate-900">{item.nom}</p><p className="text-xs text-slate-400">{item.document_type?.code ?? item.type_document}</p></div> },
    { label: 'Projet', render: (item) => item.projet ? <Link className="font-medium text-blue-600" to={`/projets/${item.projet.id}`}>{item.projet.nom}</Link> : '-' },
    { label: 'Phase', render: (item) => item.phase?.replaceAll('_', ' ') ?? '-' }, { label: 'Workflow', render: (item) => <StatusBadge value={item.workflow_status ?? item.statut} /> },
    { label: 'Fichier', render: (item) => <FileActions document={item} /> },
  ]} />
}
