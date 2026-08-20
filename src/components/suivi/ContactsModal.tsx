import { Building2, Mail, Phone, UserRound } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import type { Projet } from '@/types'

/** Contacts of a dossier, split Client / Artisans / Autres (annotations §4). */
export default function ContactsModal({ open, projet, onClose }: { open: boolean; projet: Projet | null; onClose: () => void }) {
  const partenaires = projet?.partenaires ?? []
  const artisans = partenaires.filter((partner) => partner.type_partenaire === 'artisan')
  const autres = partenaires.filter((partner) => partner.type_partenaire !== 'artisan')

  return <Modal open={open && Boolean(projet)} title={`Contacts — ${projet?.nom ?? ''}`} onClose={onClose}>
    <div className="space-y-6">
      <Group title="Client" icon={<UserRound className="h-4 w-4" />}>
        {projet?.client
          ? <ContactRow
              nom={`${projet.client.prenom ?? ''} ${projet.client.nom}`.trim()}
              detail={projet.client.type_client === 'entreprise' ? projet.client.entreprise_nom : undefined}
              email={projet.client.email}
              telephone={projet.client.telephone}
            />
          : <Empty>Aucun client rattaché à ce dossier.</Empty>}
      </Group>

      <Group title={`Artisans (${artisans.length})`} icon={<Building2 className="h-4 w-4" />}>
        {artisans.length
          ? artisans.map((partner) => <ContactRow key={partner.id} nom={partner.nom_entreprise} detail={partner.activite} email={partner.email} telephone={partner.telephone} />)
          : <Empty>Aucun artisan rattaché.</Empty>}
      </Group>

      <Group title={`Autres intervenants (${autres.length})`} icon={<Building2 className="h-4 w-4" />}>
        {autres.length
          ? autres.map((partner) => <ContactRow key={partner.id} nom={partner.nom_entreprise} detail={partner.activite ?? partner.type_partenaire} email={partner.email} telephone={partner.telephone} />)
          : <Empty>Aucun autre intervenant.</Empty>}
      </Group>
    </div>
  </Modal>
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section>
    <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{icon}{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-400">{children}</p>
}

function ContactRow({ nom, detail, email, telephone }: { nom: string; detail?: string | null; email?: string | null; telephone?: string | null }) {
  return <div className="rounded-xl border border-slate-200 px-3.5 py-3">
    <p className="text-sm font-semibold text-slate-900">{nom}</p>
    {detail && <p className="text-xs text-slate-400">{detail}</p>}
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {email
        ? <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-blue-600"><Mail className="h-3.5 w-3.5" />{email}</a>
        : <span className="text-slate-300">Email non renseigné</span>}
      {telephone && <a href={`tel:${telephone}`} className="flex items-center gap-1.5 hover:text-blue-600"><Phone className="h-3.5 w-3.5" />{telephone}</a>}
    </div>
  </div>
}
