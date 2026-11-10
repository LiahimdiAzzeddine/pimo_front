import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Save, Trash2, UserPlus, Users, X } from 'lucide-react'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import type { Client, PaginatedResponse, Partenaire, Projet } from '@/types'
import Modal from '@/components/ui/Modal'

type Category = 'client' | 'artisan' | 'autre'
type ContactKind = 'client' | 'member'

interface ProjectContact {
  id: number
  kind: ContactKind
  category: Category
  source_id: number
  nom: string
  email?: string
  telephone?: string
  role?: string
  member_role?: 'artisan' | 'photographe' | 'fournisseur' | 'autre'
  is_primary?: boolean
}

interface ContactResponse {
  clients: ProjectContact[]
  artisans: ProjectContact[]
  others: ProjectContact[]
}

interface ContactForm {
  nom: string
  email: string
  telephone: string
  role: string
  member_role: 'artisan' | 'photographe' | 'fournisseur' | 'autre'
}

const emptyForm: ContactForm = { nom: '', email: '', telephone: '', role: '', member_role: 'autre' }
const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500'

export default function ProjectContactsModal({ project, open, onClose, onChanged }: { project: Projet; open: boolean; onClose: () => void; onChanged: () => Promise<unknown> | void }) {
  const [contacts, setContacts] = useState<ContactResponse>({ clients: [], artisans: [], others: [] })
  const [clients, setClients] = useState<Client[]>([])
  const [partners, setPartners] = useState<Partenaire[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<Category>()
  const [importing, setImporting] = useState<Category>()
  const [editing, setEditing] = useState<ProjectContact>()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: contactData }, { data: clientData }, { data: partnerData }] = await Promise.all([
        api.get<ContactResponse>(`/projets/${project.id}/contacts`),
        api.get<PaginatedResponse<Client>>('/clients?limit=200'),
        api.get<PaginatedResponse<Partenaire>>('/partenaires?limit=200'),
      ])
      setContacts(contactData)
      setClients(clientData.data)
      setPartners(partnerData.data)
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Impossible de charger les contacts du chantier.'))
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load, open])

  const mutate = async (request: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await request()
      setAdding(undefined)
      setImporting(undefined)
      setEditing(undefined)
      await load()
      await onChanged()
    } catch (caught) {
      setError(apiErrorMessage(caught, 'Impossible d’enregistrer ce contact.'))
    } finally {
      setBusy(false)
    }
  }

  const addManual = (category: Category, form: ContactForm) => mutate(() => api.post(`/projets/${project.id}/contacts`, {
    category, nom: form.nom, email: form.email || null, telephone: form.telephone || null, role: form.role || null,
    member_role: category === 'autre' ? form.member_role : undefined,
  }))
  const importContact = (category: Category, sourceId: number) => mutate(() => api.post(`/projets/${project.id}/contacts`, { category, source_id: sourceId, member_role: category === 'autre' ? 'autre' : undefined }))
  const update = (contact: ProjectContact, form: ContactForm) => mutate(() => api.patch(`/projets/${project.id}/contacts/${contact.kind}/${contact.id}`, {
    nom: form.nom, email: form.email || null, telephone: form.telephone || null, role: form.role || null,
    member_role: contact.category === 'autre' ? form.member_role : undefined,
  }))
  const remove = (contact: ProjectContact) => {
    if (window.confirm(`Retirer ${contact.nom} de ce chantier ? Le contact restera dans votre carnet.`)) void mutate(() => api.delete(`/projets/${project.id}/contacts/${contact.kind}/${contact.id}`))
  }
  const cancelForms = () => { setAdding(undefined); setImporting(undefined); setEditing(undefined) }
  const close = () => { if (!busy) { cancelForms(); setError(''); onClose() } }

  return <Modal open={open} title={`Contacts — ${project.nom}`} onClose={close}>
    {loading && !contacts.clients.length && !contacts.artisans.length && !contacts.others.length
      ? <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-7 w-7 animate-spin" /><p className="mt-3 text-sm">Chargement des contacts…</p></div>
      : <div className={busy ? 'pointer-events-none opacity-70' : ''}>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <ContactSection title="Client" color="text-blue-600" category="client" contacts={contacts.clients} editing={editing} adding={adding} importing={importing} onEdit={setEditing} onRemove={remove} onUpdate={update} onAdd={setAdding} onImport={setImporting} onManualSave={addManual} onImportSave={importContact} onCancel={cancelForms} candidates={clients.map((client) => ({ id: client.id, label: `${client.prenom ?? ''} ${client.nom}`.trim(), detail: client.email ?? client.telephone }))} />
        <ContactSection title="Artisans" color="text-amber-700" category="artisan" contacts={contacts.artisans} editing={editing} adding={adding} importing={importing} onEdit={setEditing} onRemove={remove} onUpdate={update} onAdd={setAdding} onImport={setImporting} onManualSave={addManual} onImportSave={importContact} onCancel={cancelForms} candidates={partners.filter((partner) => partner.type_partenaire === 'artisan').map((partner) => ({ id: partner.id, label: partner.nom_entreprise, detail: partner.email ?? partner.telephone }))} />
        <ContactSection title="Autres" color="text-slate-600" category="autre" contacts={contacts.others} editing={editing} adding={adding} importing={importing} onEdit={setEditing} onRemove={remove} onUpdate={update} onAdd={setAdding} onImport={setImporting} onManualSave={addManual} onImportSave={importContact} onCancel={cancelForms} candidates={partners.filter((partner) => partner.type_partenaire !== 'artisan').map((partner) => ({ id: partner.id, label: partner.nom_entreprise, detail: partner.email ?? partner.telephone }))} />
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Fermer</button></div>
      </div>}
  </Modal>
}

interface SectionProps {
  title: string; color: string; category: Category; contacts: ProjectContact[]; editing?: ProjectContact; adding?: Category; importing?: Category
  candidates: { id: number; label: string; detail?: string }[]
  onEdit: (contact?: ProjectContact) => void; onRemove: (contact: ProjectContact) => void
  onUpdate: (contact: ProjectContact, form: ContactForm) => Promise<void>; onAdd: (category?: Category) => void; onImport: (category?: Category) => void
  onManualSave: (category: Category, form: ContactForm) => Promise<void>; onImportSave: (category: Category, id: number) => Promise<void>; onCancel: () => void
}

function ContactSection(props: SectionProps) {
  const usedIds = useMemo(() => new Set(props.contacts.map((contact) => contact.source_id)), [props.contacts])
  const available = props.candidates.filter((candidate) => !usedIds.has(candidate.id))
  return <section className="mb-6">
    <h3 className={`mb-2 text-xs font-bold uppercase tracking-wide ${props.color}`}>{props.title}</h3>
    <div className="space-y-1.5">{props.contacts.map((contact) => props.editing?.id === contact.id && props.editing.kind === contact.kind
      ? <ContactFormCard key={`${contact.kind}-${contact.id}`} category={props.category} initial={contact} onSave={(form) => props.onUpdate(contact, form)} onCancel={props.onCancel} />
      : <ContactRow key={`${contact.kind}-${contact.id}`} contact={contact} onEdit={() => props.onEdit(contact)} onRemove={() => props.onRemove(contact)} />)}
      {!props.contacts.length && props.adding !== props.category && props.importing !== props.category && <p className="py-2 text-sm italic text-slate-400">Aucun contact.</p>}
    </div>
    {props.adding === props.category && <ContactFormCard category={props.category} onSave={(form) => props.onManualSave(props.category, form)} onCancel={props.onCancel} />}
    {props.importing === props.category && <ImportCard candidates={available} label={props.category === 'client' ? 'Sélectionner dans le carnet clients' : 'Sélectionner un partenaire'} onSave={(id) => props.onImportSave(props.category, id)} onCancel={props.onCancel} />}
    <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => { props.onCancel(); props.onAdd(props.category) }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Plus className="h-3.5 w-3.5" />Ajouter</button><button type="button" onClick={() => { props.onCancel(); props.onImport(props.category) }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Users className="h-3.5 w-3.5" />{props.category === 'client' ? 'Depuis le carnet' : 'Depuis les partenaires'}</button></div>
  </section>
}

function ContactRow({ contact, onEdit, onRemove }: { contact: ProjectContact; onEdit: () => void; onRemove: () => void }) {
  return <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm"><UserPlus className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{contact.nom}{contact.telephone && <span className="ml-2 font-normal text-slate-400">{contact.telephone}</span>}</p><div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">{contact.is_primary && <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-700">Principal</span>}{contact.role && <span>{contact.role}</span>}{contact.email && <span className="truncate">{contact.email}</span>}</div></div><button type="button" aria-label={`Modifier ${contact.nom}`} onClick={onEdit} className="rounded-lg border border-slate-200 bg-white p-2 text-amber-600 hover:bg-amber-50"><Pencil className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Retirer ${contact.nom}`} onClick={onRemove} className="rounded-lg border border-red-200 bg-white p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button></div>
}

function ContactFormCard({ category, initial, onSave, onCancel }: { category: Category; initial?: ProjectContact; onSave: (form: ContactForm) => void; onCancel: () => void }) {
  const [form, setForm] = useState<ContactForm>({ ...emptyForm, member_role: initial?.member_role ?? 'autre', nom: initial?.nom ?? '', email: initial?.email ?? '', telephone: initial?.telephone ?? '', role: initial?.role ?? '' })
  return <form className="mb-2 rounded-xl border border-blue-100 bg-blue-50 p-3" onSubmit={(event) => { event.preventDefault(); onSave(form) }}><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs text-slate-500">Nom<input required value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} className={`${fieldClass} mt-1`} /></label><label className="text-xs text-slate-500">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`${fieldClass} mt-1`} /></label><label className="text-xs text-slate-500">Téléphone<input value={form.telephone} onChange={(event) => setForm({ ...form, telephone: event.target.value })} className={`${fieldClass} mt-1`} /></label><label className="text-xs text-slate-500">Rôle<input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder={category === 'client' ? 'Client, conjoint…' : 'Rôle sur le chantier'} className={`${fieldClass} mt-1`} /></label></div>{category === 'autre' && <label className="mt-2 block text-xs text-slate-500">Type<select value={form.member_role} onChange={(event) => setForm({ ...form, member_role: event.target.value as ContactForm['member_role'] })} className={`${fieldClass} mt-1`}><option value="autre">Autre</option><option value="photographe">Photographe</option><option value="fournisseur">Fournisseur</option></select></label>}<div className="mt-3 flex gap-2"><button className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5" />Enregistrer</button><button type="button" onClick={onCancel} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><X className="h-3.5 w-3.5" />Annuler</button></div></form>
}

function ImportCard({ candidates, label, onSave, onCancel }: { candidates: { id: number; label: string; detail?: string }[]; label: string; onSave: (id: number) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState('')
  return <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><label className="text-xs font-medium text-slate-600">{label}<select value={selected} onChange={(event) => setSelected(event.target.value)} className={`${fieldClass} mt-1`}><option value="">Choisir un contact…</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}{candidate.detail ? ` — ${candidate.detail}` : ''}</option>)}</select></label>{!candidates.length && <p className="mt-2 text-xs text-slate-400">Tous les contacts disponibles sont déjà rattachés.</p>}<div className="mt-3 flex gap-2"><button type="button" disabled={!selected} onClick={() => onSave(Number(selected))} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Ajouter au chantier</button><button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Annuler</button></div></div>
}
