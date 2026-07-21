import ResourcePage from '@/components/resources/ResourcePage'
import StatusBadge from '@/components/ui/StatusBadge'
import { useProjectOptions } from '@/hooks/useProjectOptions'
import type { Facture } from '@/types'

function totalTtc(values: Record<string, string>): string {
  const ht = values.montant_ht === '' || values.montant_ht == null ? null : Number(values.montant_ht)
  const tva = values.montant_tva === '' || values.montant_tva == null ? 0 : Number(values.montant_tva)

  if (ht === null || Number.isNaN(ht) || Number.isNaN(tva)) {
    return ''
  }

  return String(Math.round((ht + tva) * 100) / 100)
}

export default function Finances() {
  const projects = useProjectOptions()
  return <ResourcePage<Facture & { [key: string]: unknown }> endpoint="/factures" queryKey="factures" title="Finances" description="Suivez factures, acomptes, honoraires et reglements." createLabel="Nouvelle facture" fields={[
    { name: 'projet_id', label: 'Projet', type: 'select', required: true, options: projects }, { name: 'numero', label: 'Numero' },
    { name: 'type_facture', label: 'Type', type: 'select', options: ['facture_artisan', 'facture_moe_client', 'facture_moe_artisan', 'acompte', 'solde'].map((value) => ({ value, label: value.replaceAll('_', ' ') })) },
    { name: 'montant_ht', label: 'Montant HT', type: 'number' }, { name: 'montant_tva', label: 'TVA', type: 'number' }, { name: 'montant_ttc', label: 'Montant TTC', type: 'number', readOnly: true, compute: totalTtc },
    { name: 'date_emission', label: 'Date emission', type: 'date' }, { name: 'statut', label: 'Statut', type: 'select', options: ['brouillon', 'envoyee', 'en_attente', 'payee'].map((value) => ({ value, label: value.replaceAll('_', ' ') })) },
  ]} columns={[
    { label: 'Facture', render: (item) => <div><p className="font-semibold text-slate-900">{item.numero ?? `Facture #${item.id}`}</p><p className="text-xs text-slate-400">{item.type_facture.replaceAll('_', ' ')}</p></div> },
    { label: 'Projet', render: (item) => item.projet?.nom ?? '-' }, { label: 'Montant TTC', render: (item) => <span className="font-semibold text-slate-900">{Number(item.montant_ttc ?? 0).toLocaleString('fr-FR')} EUR</span> },
    { label: 'Emission', render: (item) => item.date_emission ? new Date(item.date_emission).toLocaleDateString('fr-FR') : '-' }, { label: 'Statut', render: (item) => <StatusBadge value={item.statut} /> },
  ]} />
}
