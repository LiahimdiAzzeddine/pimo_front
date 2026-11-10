import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Award, BriefcaseBusiness, CalendarClock, CheckCircle2, Download, HardHat, PackageOpen, Pencil, Plus, Send, Trash2, TrendingDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api, { isLocalApp } from '@/lib/api'
import ConsulterModal from '@/components/consultation/ConsulterModal'
import LotFormModal from '@/components/consultation/LotFormModal'
import OffreFormModal from '@/components/consultation/OffreFormModal'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { useProjectOptions } from '@/hooks/useProjectOptions'
import type { Devis, Lot, PaginatedResponse, Partenaire, Projet } from '@/types'

const euro = (value?: number | string | null) => value == null ? '-' : `${Number(value).toLocaleString('fr-FR')} EUR`
const OPEN_STATUSES = ['en_attente', 'recu']

export default function Consultation() {
  const projects = useProjectOptions()
  const [searchParams, setSearchParams] = useSearchParams()
  const projetId = searchParams.get('projet') ?? ''
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [lotModal, setLotModal] = useState<{ open: boolean; lot: Lot | null }>({ open: false, lot: null })
  const [offreModal, setOffreModal] = useState<{ open: boolean; lot: Lot | null }>({ open: false, lot: null })
  const [consulterModal, setConsulterModal] = useState<{ open: boolean; lot: Lot | null }>({ open: false, lot: null })

  const lots = useQuery({
    queryKey: ['lots', projetId],
    enabled: Boolean(projetId),
    queryFn: async () => (await api.get<Lot[]>(`/projets/${projetId}/lots`)).data,
  })
  const devis = useQuery({
    queryKey: ['devis-consultation', projetId],
    enabled: Boolean(projetId),
    queryFn: async () => (await api.get<PaginatedResponse<Devis>>(`/devis?projet_id=${projetId}&limit=200`)).data.data,
  })
  const partners = useQuery({
    queryKey: ['consultation-partners'],
    enabled: Boolean(projetId),
    queryFn: async () => (await api.get<PaginatedResponse<Partenaire>>('/partenaires?limit=200')).data.data,
  })
  const projet = useQuery({
    queryKey: ['consultation-projet', projetId],
    enabled: Boolean(projetId),
    queryFn: async () => (await api.get<Projet>(`/projets/${projetId}`)).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['lots', projetId] })
    queryClient.invalidateQueries({ queryKey: ['devis-consultation', projetId] })
    queryClient.invalidateQueries({ queryKey: ['consultation-projet', projetId] })
  }
  const updateStatut = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) => api.patch(`/devis/${id}`, { statut }),
    onSuccess: () => { refresh(); setError('') },
    onError: () => setError('Impossible de mettre a jour cette offre.'),
  })
  const attribuer = useMutation({
    mutationFn: ({ lotId, devisId }: { lotId: number; devisId: number }) => api.post(`/lots/${lotId}/attribuer`, { devis_id: devisId }),
    onSuccess: () => { refresh(); setError('') },
    onError: () => setError('Impossible d attribuer ce lot. Verifiez l offre selectionnee.'),
  })
  const deleteLot = useMutation({
    mutationFn: (lotId: number) => api.delete(`/lots/${lotId}`),
    onSuccess: () => { refresh(); setError('') },
    onError: () => setError('Impossible de supprimer ce lot.'),
  })
  const passerChantier = useMutation({
    mutationFn: () => api.patch(`/projets/${projetId}`, { phase: 'chantier' }),
    onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: ['project-options'] }); setError('') },
    onError: () => setError('Impossible de faire passer le projet en phase Chantier.'),
  })
  const busy = updateStatut.isPending || attribuer.isPending || deleteLot.isPending || passerChantier.isPending

  const offres = (devis.data ?? []).filter((offre) => offre.type !== 'mo')
  const lotsList = lots.data ?? []
  const attribues = lotsList.filter((lot) => lot.statut === 'valide')
  const horsLot = offres.filter((offre) => !offre.lot_id)
  const retenues = offres.filter((offre) => offre.statut === 'valide' && offre.lot_id && attribues.some((lot) => lot.id === offre.lot_id))
  const totalRetenu = retenues.reduce((sum, offre) => sum + Number(offre.montant_ht ?? 0), 0)
  const consultationTerminee = lotsList.length > 0 && attribues.length === lotsList.length
  const phaseAvantChantier = ['etude_faisabilite', 'consultation_entreprises', 'analyse_offres'].includes(projet.data?.phase ?? '')
  const prochaineButoir = offres
    .filter((offre) => OPEN_STATUSES.includes(offre.statut) && offre.date_butoir && new Date(offre.date_butoir) >= new Date())
    .map((offre) => offre.date_butoir as string).sort()[0]

  const downloadOffre = async (offre: Devis) => {
    if (!offre.document) return
    try {
      const response = await api.get<Blob>(`/documents/${offre.document.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = offre.document.original_file_name ?? offre.document.nom
      anchor.click()
      URL.revokeObjectURL(url)
      setError('')
    } catch {
      setError('Impossible de telecharger le devis.')
    }
  }

  const confirmAttribution = (lot: Lot, offre: Devis) => {
    const entreprise = offre.partenaire?.nom_entreprise ?? offre.partenaire_nom ?? 'cette entreprise'
    if (window.confirm(`Attribuer le lot « ${lot.nom} » a ${entreprise} ? Les autres offres du lot seront refusees.`)) {
      attribuer.mutate({ lotId: lot.id, devisId: offre.id })
    }
  }

  return <>
    <PageHeader title="Consultation" description="Comparez les offres recues lot par lot et attribuez chaque lot a l entreprise retenue." action={
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Projet consulte" value={projetId} onChange={(event) => setSearchParams(event.target.value ? { projet: event.target.value } : {}, { replace: true })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-400">
          <option value="">Choisir un projet</option>
          {projects.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}
        </select>
        {projetId && <button onClick={() => setLotModal({ open: true, lot: null })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Ajouter un lot</button>}
      </div>
    } />

    {!projetId && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
      <BriefcaseBusiness className="mx-auto h-9 w-9 text-slate-300" />
      <p className="mt-3 font-semibold text-slate-700">Selectionnez un projet pour ouvrir sa consultation.</p>
      <p className="mt-1 text-sm text-slate-400">Vous verrez les lots de travaux, les offres recues et le comparatif par lot.</p>
    </section>}

    {projetId && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-slate-950 p-5 text-white"><Award className="mb-4 h-6 w-6 text-blue-300" /><p className="text-3xl font-bold">{attribues.length}/{lotsList.length}</p><p className="text-sm text-slate-300">Lots attribues</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><PackageOpen className="mb-4 h-6 w-6 text-blue-600" /><p className="text-3xl font-bold">{offres.length}</p><p className="text-sm text-slate-500">Offres recues ou attendues</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><TrendingDown className="mb-4 h-6 w-6 text-emerald-600" /><p className="text-3xl font-bold">{euro(totalRetenu)}</p><p className="text-sm text-slate-500">Total HT des offres retenues</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5"><CalendarClock className="mb-4 h-6 w-6 text-amber-600" /><p className="text-3xl font-bold">{prochaineButoir ? new Date(prochaineButoir).toLocaleDateString('fr-FR') : '-'}</p><p className="text-sm text-slate-500">Prochaine date butoir</p></article>
      </div>

      {error && <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

      {consultationTerminee && phaseAvantChantier && <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1"><p className="font-semibold text-emerald-900">Tous les lots sont attribues.</p><p className="text-sm text-emerald-700">La consultation est terminee : le projet peut passer en phase Chantier ({euro(totalRetenu)} HT de travaux engages).</p></div>
        <button disabled={busy} onClick={() => passerChantier.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><HardHat className="h-4 w-4" />{passerChantier.isPending ? 'Passage en cours...' : 'Passer en phase Chantier'}</button>
      </div>}
      {consultationTerminee && projet.data?.phase === 'chantier' && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <HardHat className="h-6 w-6 shrink-0 text-blue-600" />
        <p className="text-sm font-semibold text-blue-900">Consultation terminee — le projet est en phase Chantier. Retrouvez-le dans le Suivi chantier.</p>
      </div>}

      {(lots.isLoading || devis.isLoading) && <div className="mt-6 grid animate-pulse gap-5">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-44 rounded-2xl bg-slate-200" />)}</div>}

      {!lots.isLoading && lotsList.length === 0 && <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <PackageOpen className="mx-auto h-9 w-9 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-700">Aucun lot de travaux sur ce projet.</p>
        <p className="mt-1 text-sm text-slate-400">Decoupez le projet en lots pour lancer la consultation des entreprises.</p>
        <button onClick={() => setLotModal({ open: true, lot: null })} className="mx-auto mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Creer le premier lot</button>
      </section>}

      <div className="mt-6 space-y-5">
        {lotsList.map((lot) => <LotCard key={lot.id} lot={lot} offres={offres.filter((offre) => offre.lot_id === lot.id)} busy={busy}
          onValider={(offre) => updateStatut.mutate({ id: offre.id, statut: 'valide' })}
          onRefuser={(offre) => updateStatut.mutate({ id: offre.id, statut: 'refuse' })}
          onAttribuer={(offre) => confirmAttribution(lot, offre)}
          onDownload={downloadOffre}
          onAddOffre={() => setOffreModal({ open: true, lot })}
          onConsulter={() => setConsulterModal({ open: true, lot })}
          onRename={() => setLotModal({ open: true, lot })}
          onDelete={() => { if (window.confirm(`Supprimer le lot « ${lot.nom} » ? Ses offres seront conservees dans « Offres hors lot ».`)) deleteLot.mutate(lot.id) }} />)}
      </div>

      {horsLot.length > 0 && <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h2 className="font-bold">Offres hors lot</h2><p className="text-xs text-slate-400">Devis non rattaches a un lot de travaux</p></div>
        <OffresTable offres={horsLot} busy={busy} onValider={(offre) => updateStatut.mutate({ id: offre.id, statut: 'valide' })} onRefuser={(offre) => updateStatut.mutate({ id: offre.id, statut: 'refuse' })} onDownload={downloadOffre} />
      </section>}

      <LotFormModal open={lotModal.open} projetId={projetId} lot={lotModal.lot} onSaved={refresh} onClose={() => setLotModal({ open: false, lot: null })} />
      <OffreFormModal open={offreModal.open} projetId={projetId} lot={offreModal.lot} partners={partners.data ?? []} onSaved={refresh} onClose={() => setOffreModal({ open: false, lot: null })} />
      <ConsulterModal open={consulterModal.open} lot={consulterModal.lot} partners={partners.data ?? []} onSaved={refresh} onClose={() => setConsulterModal({ open: false, lot: null })} />
    </>}
  </>
}

function LotCard({ lot, offres, busy, onValider, onRefuser, onAttribuer, onDownload, onAddOffre, onConsulter, onRename, onDelete }: {
  lot: Lot; offres: Devis[]; busy: boolean
  onValider: (offre: Devis) => void; onRefuser: (offre: Devis) => void; onAttribuer: (offre: Devis) => void; onDownload: (offre: Devis) => void
  onAddOffre: () => void; onConsulter: () => void; onRename: () => void; onDelete: () => void
}) {
  const attribue = lot.statut === 'valide'
  const chiffrees = offres.filter((offre) => offre.montant_ht != null && offre.statut !== 'refuse')
  const montants = chiffrees.map((offre) => Number(offre.montant_ht))
  const minHt = montants.length ? Math.min(...montants) : null
  const maxHt = montants.length ? Math.max(...montants) : null

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{lot.nom}</h2><StatusBadge value={lot.statut} /></div>
        <p className="mt-1 text-xs text-slate-400">{offres.length} offre(s){minHt != null && maxHt != null && montants.length > 1 && ` - fourchette ${euro(minHt)} a ${euro(maxHt)} (ecart ${euro(maxHt - minHt)})`}</p>
      </div>
      {attribue && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Attribue a {lot.partenaire?.nom_entreprise ?? lot.artisan_nom ?? 'une entreprise'}</span>}
      <div className="flex items-center gap-1">
        {!attribue && !isLocalApp && <button type="button" disabled={busy} onClick={onConsulter} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-4 w-4" />Consulter les entreprises</button>}
        {!attribue && <button type="button" disabled={busy} onClick={onAddOffre} className="mr-1 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Plus className="h-4 w-4" />Ajouter une offre</button>}
        <button type="button" title="Renommer le lot" disabled={busy} onClick={onRename} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><Pencil className="h-4 w-4" /></button>
        <button type="button" title="Supprimer le lot" disabled={busy} onClick={onDelete} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
    {offres.length === 0
      ? <div className="p-8 text-center"><p className="text-sm text-slate-400">Aucune offre sur ce lot pour le moment.</p><button type="button" onClick={onAddOffre} className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700">Enregistrer une premiere offre</button></div>
      : <OffresTable offres={offres} busy={busy} bestHt={minHt} lotAttribue={attribue} onValider={onValider} onRefuser={onRefuser} onAttribuer={onAttribuer} onDownload={onDownload} />}
  </section>
}

function OffresTable({ offres, busy, bestHt, lotAttribue, onValider, onRefuser, onAttribuer, onDownload }: {
  offres: Devis[]; busy: boolean; bestHt?: number | null; lotAttribue?: boolean
  onValider: (offre: Devis) => void; onRefuser: (offre: Devis) => void; onAttribuer?: (offre: Devis) => void; onDownload: (offre: Devis) => void
}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left">
    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr>
      <th className="px-5 py-3 font-semibold">Entreprise</th><th className="px-5 py-3 font-semibold">Montant HT</th><th className="px-5 py-3 font-semibold">Montant TTC</th>
      <th className="px-5 py-3 font-semibold">Date butoir</th><th className="px-5 py-3 font-semibold">Statut</th><th className="px-5 py-3 text-right font-semibold">Actions</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{offres.map((offre) => {
      const isBest = bestHt != null && offre.montant_ht != null && Number(offre.montant_ht) === bestHt && offre.statut !== 'refuse'
      return <tr key={offre.id} className={isBest ? 'bg-emerald-50/50' : 'hover:bg-slate-50/60'}>
        <td className="px-5 py-4 text-sm">
          <p className="font-semibold text-slate-900">{offre.partenaire?.nom_entreprise ?? offre.partenaire_nom ?? '-'}</p>
          <p className="text-xs text-slate-400">{offre.partenaire?.activite ?? offre.partenaire?.email ?? (offre.statut === 'en_attente' ? 'Reponse attendue' : '')}</p>
        </td>
        <td className="px-5 py-4 text-sm font-semibold text-slate-900">{euro(offre.montant_ht)}{isBest && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Moins-disant</span>}</td>
        <td className="px-5 py-4 text-sm text-slate-600">{euro(offre.montant_ttc)}</td>
        <td className="px-5 py-4 text-sm text-slate-600">{offre.date_butoir ? new Date(offre.date_butoir).toLocaleDateString('fr-FR') : '-'}</td>
        <td className="px-5 py-4"><StatusBadge value={offre.statut} /></td>
        <td className="px-5 py-4">
          <div className="flex flex-wrap justify-end gap-2">
            {offre.document && <button type="button" title="Telecharger le devis" disabled={busy} onClick={() => onDownload(offre)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"><Download className="h-4 w-4" /></button>}
            {offre.statut === 'recu' && <><button type="button" disabled={busy} onClick={() => onRefuser(offre)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Refuser</button>
              <button type="button" disabled={busy} onClick={() => onValider(offre)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Valider</button></>}
            {offre.statut === 'en_attente' && <button type="button" disabled={busy} onClick={() => onRefuser(offre)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50">Ecarter</button>}
            {onAttribuer && !lotAttribue && ['recu', 'valide'].includes(offre.statut) && <button type="button" disabled={busy} onClick={() => onAttribuer(offre)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Award className="h-4 w-4" />Attribuer le lot</button>}
          </div>
        </td>
      </tr>
    })}</tbody>
  </table></div>
}
