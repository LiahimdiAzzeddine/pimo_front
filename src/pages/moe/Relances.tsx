import ResourcePage from '@/components/resources/ResourcePage'
import StatusBadge from '@/components/ui/StatusBadge'
import { useProjectOptions } from '@/hooks/useProjectOptions'
import type { Relance } from '@/types'

export default function Relances() {
  const projects = useProjectOptions()
  return <ResourcePage<Relance & { [key: string]: unknown }> endpoint="/relances" queryKey="relances" title="Relances" description="Programmez et consultez l historique des relances automatiques." createLabel="Programmer une relance" fields={[
    { name: 'projet_id', label: 'Projet', type: 'select', required: true, options: projects }, { name: 'destinataire_email', label: 'Destinataire', type: 'email', required: true },
    { name: 'type_relance', label: 'Type', type: 'select', options: ['document_manquant', 'validation_document', 'signature', 'facturation', 'autre'].map((value) => ({ value, label: value.replaceAll('_', ' ') })) },
    { name: 'objet', label: 'Objet' }, { name: 'message', label: 'Message', type: 'textarea' }, { name: 'scheduled_at', label: 'Date et heure d envoi', type: 'datetime-local' },
    { name: 'send_now', label: 'Envoyer la relance immediatement', type: 'checkbox' },
  ]} columns={[
    { label: 'Relance', render: (item) => <div><p className="font-semibold text-slate-900">{item.objet ?? item.type_relance.replaceAll('_', ' ')}</p><p className="text-xs text-slate-400">{item.destinataire_email}</p></div> },
    { label: 'Projet', render: (item) => item.projet?.nom ?? '-' }, { label: 'Programmation', render: (item) => item.scheduled_at ? new Date(item.scheduled_at).toLocaleString('fr-FR') : 'Immediat' },
    { label: 'Tentatives', render: (item) => item.attempts }, { label: 'Statut', render: (item) => <StatusBadge value={item.statut} /> },
  ]} editable={(item) => item.statut !== 'envoyee'} editLabel="Modifier la relance" />
}
