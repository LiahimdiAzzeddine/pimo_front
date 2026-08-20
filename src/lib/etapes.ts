import type { PhaseKey } from '@/lib/phases'

/**
 * Catalogue of the phase steps ("étapes") from the "Suivi Chantier" prototype,
 * transcribed from Annotations_Suivi_Chantier.pdf §6.
 *
 * There is no API behind this yet: the backend models documents, not steps.
 * Everything here is therefore static, and step/checkbox state is local to the
 * session. The shape mirrors what a future `phase_steps` endpoint should return
 * so the catalogue can be swapped for a query without touching the components.
 */

export type BlocKind =
  | 'fields'        // date + free notes, with a save action
  | 'checklist'     // checkboxes with an "x/y validés" counter
  | 'receipts'      // expected items, each marked received individually
  | 'documents'     // real project documents, filtered and selectable
  | 'honoraires'    // reusable "statut honoraires de phase" component
  | 'validation'    // client agreement: verbal, or signed file
  | 'outline'       // structure of a screen we have not built yet

export interface EtapeBloc {
  key: string
  title: string
  kind: BlocKind
  /** `fields` — the inputs to render. */
  fields?: { key: string; label: string; type: 'date' | 'datetime-local' | 'textarea'; placeholder?: string }[]
  /** `checklist` / `receipts` — the items. */
  items?: string[]
  /** `checklist` — short name shown next to the counter. */
  counterLabel?: string
  /** `receipts` — optional audience toggle (Particulier / Entreprise). */
  audiences?: string[]
  /** `documents` — restrict to these `type_document` values; omitted means "any". */
  documentTypes?: string[]
  /** `documents` — empty-state hint, mirroring the prototype's detection message. */
  emptyHint?: string
  /** `outline` — the sub-steps of a screen still to be built. */
  sections?: { title: string; detail: string }[]
  /** `outline` — endpoints that already exist for this screen, if any. */
  backing?: string
}

export interface EtapeDefinition {
  key: string
  label: string
  description: string
  blocs: EtapeBloc[]
}

const consultationBlocs = (reprise: boolean): EtapeBloc[] => [
  {
    key: 'consultation',
    title: 'Consultation des entreprises',
    kind: 'outline',
    backing: 'POST /lots/{id}/consulter · POST /lots/{id}/attribuer · GET /projets/{id}/lots',
    sections: [
      { title: 'Étape 1 — Documents à envoyer', detail: 'Pièces du DCE jointes à la consultation.' },
      {
        title: 'Étape 2 — Constitution des équipes',
        detail: reprise
          ? 'Équipes et artisans par lot. Reprise possible des équipes de la phase 1.'
          : 'Équipes et artisans par lot, un lot par artisan.',
      },
      { title: 'Étape 3 — Envoi', detail: 'Date et heure limite de remise des devis, puis envoi à toutes les équipes.' },
      { title: 'Étape 4 — Suivi par lot', detail: 'Avancement par entreprise : envoyé, relancé, reçu, en retard, inactif.' },
      { title: 'Étape 5 — Sélection finale', detail: 'Verrouillée tant qu\'aucun devis n\'est reçu.' },
    ],
  },
]

export const ETAPES: Record<PhaseKey, EtapeDefinition[]> = {
  etude_faisabilite: [
    {
      key: 'rdv_client_analyse',
      label: 'RDV client + Analyse de faisabilité',
      description: 'Visite, programme, budget + vérification des contraintes réglementaires et techniques. (CC-A2 : fusion Visite+Analyse)',
      blocs: [
        {
          key: 'rdv',
          title: 'A — RDV client',
          kind: 'fields',
          fields: [
            { key: 'date_visite', label: 'Date de visite', type: 'date' },
            { key: 'notes', label: 'Notes (programme, budget…)', type: 'textarea', placeholder: 'Ex : cuisine ouverte, budget 180k€, permis PC…' },
          ],
        },
        {
          key: 'analyse',
          title: 'B — Analyse de faisabilité',
          kind: 'checklist',
          counterLabel: 'Faisabilité',
          items: [
            'Contraintes PLU / urbanisme vérifiées',
            'Contraintes géotechniques vérifiées',
            'Réseaux vérifiés (eau, électricité, assainissement)',
            'Accessibilité / PMR vérifiée',
            'Budget compatible avec le programme',
            'Délais compatibles avec les attentes client',
          ],
        },
      ],
    },
    {
      key: 'devis_validation_client',
      label: 'Devis + Validation client',
      description: 'Devis honoraires MOE + accord client (verbal ou signé).',
      blocs: [
        { key: 'devis_moe', title: 'A — Devis honoraires MOE', kind: 'honoraires' },
        { key: 'validation', title: 'B — Validation client', kind: 'validation' },
      ],
    },
    {
      key: 'esquisse_notice',
      label: 'Esquisse + Notice descriptive',
      description: 'Premières planches / orientations architecturales + programme, notice, cahier des charges. (CC-A2 : fusion Esquisse+Notice)',
      blocs: [
        { key: 'esq', title: 'A — Esquisse / documents ESQ', kind: 'documents', documentTypes: ['plan'], emptyHint: 'Aucune planche ESQ déposée sur ce projet.' },
        { key: 'notice', title: 'B — Notice descriptive', kind: 'documents', documentTypes: ['autre', 'contrat'], emptyHint: 'Aucune notice descriptive déposée.' },
      ],
    },
    {
      key: 'consultation_artisans',
      label: 'Consultation artisans',
      description: 'Équipes, envoi, réception devis, décision — phases A/B/C/D.',
      blocs: consultationBlocs(false),
    },
    {
      key: 'comparatif_offres',
      label: 'Comparatif offres',
      description: 'Comparaison des offres reçues, lot par lot.',
      blocs: [
        {
          key: 'comparatif',
          title: 'Comparatif des offres',
          kind: 'outline',
          backing: 'GET /devis?projet_id={id}',
          sections: [
            { title: 'Tableau comparatif', detail: 'Lots en lignes, artisans en colonnes, montant le plus bas surligné.' },
            { title: 'Export', detail: 'Export PDF du comparatif à joindre au dossier client.' },
          ],
        },
      ],
    },
  ],

  consultation_entreprises: [
    {
      key: 'validation_honoraires_ph2',
      label: 'Validation honoraires ph.2',
      description: 'Devis/avenant honoraires phase dossier admin — statut validation.',
      blocs: [{ key: 'honoraires', title: 'Devis honoraires phase 2', kind: 'honoraires' }],
    },
    {
      key: 'documents_client',
      label: 'Documents client',
      description: 'CNI, justificatif domicile, Kbis selon type client.',
      blocs: [
        {
          key: 'pieces',
          title: 'Type client',
          kind: 'receipts',
          audiences: ['Particulier', 'Entreprise'],
          items: [
            'CNI (copie recto-verso)',
            'Justificatif domicile',
            'Date et lieu de naissance',
            'Extrait Kbis (< 3 mois)',
          ],
        },
      ],
    },
    {
      key: 'plans_pc_dp_at',
      label: 'Plans PC / DP / AT',
      description: 'Élaboration des plans de dépôt de permis.',
      blocs: [
        { key: 'plans', title: 'Plans', kind: 'documents', documentTypes: ['plan'], emptyHint: 'Aucun plan de dépôt déposé.' },
        { key: 'formulaires', title: 'Formulaires', kind: 'documents', documentTypes: ['contrat', 'autre'], emptyHint: 'Aucun formulaire CERFA déposé.' },
        { key: 'autres', title: 'Autres', kind: 'documents', emptyHint: 'Aucune pièce complémentaire déposée.' },
      ],
    },
    {
      key: 'depot_instruction',
      label: 'Dépôt + Instruction',
      description: 'Dépôt en mairie et suivi de l\'instruction du dossier.',
      blocs: [
        {
          key: 'depot',
          title: 'Dépôt et instruction',
          kind: 'fields',
          fields: [
            { key: 'date_depot', label: 'Date de dépôt', type: 'date' },
            { key: 'notes', label: 'Suivi de l\'instruction', type: 'textarea', placeholder: 'Récépissé, demandes de pièces complémentaires, délais…' },
          ],
        },
      ],
    },
    {
      key: 'panneau_chantier',
      label: 'Panneau de chantier',
      description: 'Affichage réglementaire de l\'autorisation sur le terrain.',
      blocs: [
        {
          key: 'affichage',
          title: 'Affichage',
          kind: 'fields',
          fields: [{ key: 'date_affichage', label: 'Date d\'affichage', type: 'date' }],
        },
      ],
    },
  ],

  analyse_offres: [
    {
      key: 'validation_honoraires_ph3',
      label: 'Validation honoraires ph.3',
      description: 'Devis/avenant honoraires phase DCE / offre — statut validation.',
      blocs: [{ key: 'honoraires', title: 'Devis honoraires phase 3', kind: 'honoraires' }],
    },
    {
      key: 'equipes_consultation',
      label: 'Constitution équipes + Consultation',
      description: 'Équipes, envoi du DCE, réception des devis, décision — phases A/B/C/D.',
      blocs: consultationBlocs(true),
    },
    {
      key: 'comparatif_offres_dce',
      label: 'Comparatif offres',
      description: 'Comparaison finale des offres, lot par lot.',
      blocs: [
        {
          key: 'comparatif',
          title: 'Comparatif des offres',
          kind: 'outline',
          backing: 'GET /devis?projet_id={id}',
          sections: [
            { title: 'Tableau comparatif', detail: 'Lots en lignes, artisans en colonnes, montant le plus bas surligné.' },
            { title: 'Export', detail: 'Export PDF du comparatif.' },
          ],
        },
      ],
    },
    {
      key: 'selection_finale',
      label: 'Sélection finale par lot',
      description: 'Attribution de chaque lot à l\'entreprise retenue.',
      blocs: [
        {
          key: 'selection',
          title: 'Attribution',
          kind: 'outline',
          backing: 'POST /lots/{id}/attribuer',
          sections: [
            { title: 'Sélection par lot', detail: 'Un bouton par entreprise ; le lot attribué est confirmé en vert.' },
            { title: 'Notification', detail: 'Notifier les entreprises non retenues.' },
          ],
        },
      ],
    },
    {
      key: 'devis_planning_valides',
      label: 'Devis + Planning validés',
      description: 'Pièces contractuelles à réunir avant le démarrage du chantier.',
      blocs: [
        {
          key: 'pieces',
          title: 'Pièces attendues',
          kind: 'checklist',
          counterLabel: 'Pièces',
          items: [
            'Devis / marché contresigné',
            'Facture d\'acompte',
            'Planning signé',
            'Attestation d\'assurance',
          ],
        },
      ],
    },
  ],

  chantier: [
    {
      key: 'validation_honoraires_ph4',
      label: 'Validation honoraires ph.4',
      description: 'Devis/avenant honoraires phase chantier — statut validation.',
      blocs: [{ key: 'honoraires', title: 'Devis honoraires phase 4', kind: 'honoraires' }],
    },
    {
      key: 'comptes_rendus',
      label: 'Comptes-rendus',
      description: 'Comptes rendus de visite de chantier, diffusés aux intervenants avec accusé de lecture.',
      blocs: [
        {
          key: 'cr',
          title: 'Comptes rendus de chantier',
          kind: 'outline',
          backing: 'GET/POST /projets/{id}/comptes-rendus · POST /comptes-rendus/{id}/diffuser · /relancer · /photos',
          sections: [
            { title: 'Liste des CR', detail: 'Numéro, date de visite, statut, marqueur « dernier ».' },
            { title: 'Rédaction', detail: 'Présents, avancement par lot, observations, points de vigilance, prochaine réunion, photos.' },
            { title: 'Diffusion', detail: 'Destinataires chargés automatiquement, accusé de lecture, validation tacite après 3 jours.' },
          ],
        },
      ],
    },
    {
      key: 'factures_avenants',
      label: 'Factures + Avenants',
      description: 'Situations de travaux des artisans et avenants au marché.',
      blocs: [
        {
          key: 'factures',
          title: 'Situations de travaux',
          kind: 'outline',
          backing: 'POST /factures/{id}/viser · /demander-correction · /envoyer-client · /relancer',
          sections: [
            { title: 'Factures par lot', detail: 'Situations déposées par les artisans, visa MOE puis envoi au client.' },
            { title: 'Double confirmation', detail: 'Le client annonce le paiement, l\'artisan confirme la réception.' },
            { title: 'Avenants', detail: 'Liste séparée des avenants au marché.' },
          ],
        },
      ],
    },
  ],

  cloture: [
    {
      key: 'reserves_levee',
      label: 'Réserves + Levée',
      description: 'Réserves relevées à la réception, groupées par artisan, et suivi de leur levée.',
      blocs: [
        {
          key: 'reserves',
          title: 'Réserves',
          kind: 'outline',
          sections: [
            { title: 'Réserves par artisan', detail: 'Progression et état de levée par entreprise.' },
            { title: 'Alimentation', detail: 'Ajout manuel ou import depuis un compte rendu.' },
            { title: 'CR de finition', detail: 'Dépôt du compte rendu de finition.' },
          ],
        },
      ],
    },
    {
      key: 'pv_reception',
      label: 'PV de réception',
      description: 'Procès-verbal de réception des travaux, signé par le client et les artisans.',
      blocs: [
        {
          key: 'pv',
          title: 'Procès-verbal',
          kind: 'outline',
          sections: [
            { title: 'Client', detail: 'Envoi au client, puis marquage signé avec date.' },
            { title: 'Artisans', detail: 'Chargés depuis la sélection finale de la phase 3.' },
            { title: 'Génération', detail: 'Création automatique du PV de réception.' },
          ],
        },
      ],
    },
    {
      key: 'dac',
      label: 'DAC',
      description: 'Déclaration d\'achèvement et de conformité des travaux.',
      blocs: [
        {
          key: 'dac',
          title: 'Déclaration d\'achèvement',
          kind: 'outline',
          sections: [
            { title: 'Statut', detail: 'Non demandé → relancé → confirmé reçu avec date.' },
            { title: 'Relance', detail: 'Relance du client tant que la DAC n\'est pas confirmée.' },
          ],
        },
      ],
    },
    {
      key: 'attestations_garanties',
      label: 'Attestations + Garanties',
      description: 'Attestations légales par lot et garanties courant à compter de la réception.',
      blocs: [
        {
          key: 'garanties',
          title: 'Attestations et garanties',
          kind: 'outline',
          backing: 'POST /partenaires/{id}/relance-attestation · /valider-attestation',
          sections: [
            { title: 'Attestations légales', detail: 'Regroupées par lot / artisan.' },
            { title: 'Garanties', detail: 'Parfait achèvement (1 an), biennale (2 ans), décennale (10 ans), calculées depuis la date du PV.' },
          ],
        },
      ],
    },
    {
      key: 'photographe',
      label: 'Photographe',
      description: 'Reportage photo de fin de chantier.',
      blocs: [
        {
          key: 'rdv',
          title: 'Rendez-vous',
          kind: 'fields',
          fields: [
            { key: 'date_rdv', label: 'Date du rendez-vous', type: 'date' },
            { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Photographe retenu, pièces à shooter…' },
          ],
        },
      ],
    },
    {
      key: 'archivage',
      label: 'Archivage dossier',
      description: 'L\'archivage retire le dossier de la vue principale et le place en phase 6.',
      blocs: [
        {
          key: 'archivage',
          title: 'Archivage',
          kind: 'outline',
          sections: [{ title: 'Archiver', detail: 'Le dossier reste consultable mais sort des dossiers actifs.' }],
        },
      ],
    },
  ],
}

export function etapesForPhase(phase?: string | null): EtapeDefinition[] {
  return ETAPES[phase as PhaseKey] ?? []
}
