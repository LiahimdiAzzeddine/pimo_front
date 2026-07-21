export interface User {
  id: number
  name: string
  email: string
  phone?: string
  company_name?: string
  siret?: string
  address?: string
  legal_mentions?: string
  email_signature?: string
  avatar_path?: string
  avatar_url?: string
  preferences?: {
    language?: 'fr' | 'en'
    timezone?: string
    email_notifications?: boolean
    reminder_notifications?: boolean
  }
  status: string
  roles: { name: string }[]
  effective_permissions: string[]
  email_verified_at?: string
  last_login_at?: string
}

export interface Client {
  id: number
  nom: string
  prenom?: string
  email?: string
  telephone?: string
  type_client: 'particulier' | 'entreprise'
  entreprise_nom?: string
  adresse?: string
  civilite?: 'Monsieur' | 'Madame' | 'Mesdames' | 'Messieurs'
  kbis?: string
  notes?: string
  projets_count?: number
  projets?: Pick<Projet, 'id' | 'nom'>[]
}

export interface Partenaire {
  id: number
  nom_entreprise: string
  activite?: string
  email?: string
  telephone?: string
  type_partenaire: string
  siret?: string
  attestation_validite?: string
  attestation_assurance_url?: string
  attestation_assurance_path?: string
  attestation_assurance_original_name?: string
  attestation_assurance_mime_type?: string
  attestation_assurance_size?: number
  attestation_assurance_download_url?: string
  attestation_validated_at?: string | null
  adresse?: string
  notes?: string
  projets_count?: number
  devis_count?: number
}

export interface Devis {
  id: number; projet_id: number; partenaire_id?: number; partenaire_nom?: string; lot_id?: number; lot?: string
  type?: 'mo' | 'artisan'; montant_ht?: number; montant_ttc?: number; taux_tva?: number; statut: string; phase?: string; date_butoir?: string
  document_id?: number; notes?: string; created_at?: string
  projet?: Projet; partenaire?: Partenaire; lot_reference?: Lot; document?: Document
}

export interface Lot {
  id: number
  projet_id: number
  equipe_id?: number
  partenaire_id?: number
  nom: string
  artisan_nom?: string
  statut: string
  devis_count?: number
  partenaire?: Partenaire
}

export interface Facture {
  id: number; projet_id: number; numero?: string; type_facture: string; montant_ht?: number; montant_tva?: number
  montant_ttc?: number; honoraires_moe?: number; statut: string; date_emission?: string; projet?: Projet; partenaire?: Partenaire; client?: Client
}

export interface Relance {
  id: number; projet_id: number; type_relance: string; destinataire_email: string; objet?: string; message?: string
  statut: string; scheduled_at?: string; sent_at?: string; attempts: number; projet?: Projet
}

export interface Projet {
  id: number
  nom: string
  adresse?: string
  description?: string
  phase: string
  statut: string
  type_marche: string
  project_type: 'neuf_residentiel' | 'renovation_extension' | 'erp_tertiaire' | 'marche_public'
  honoraires_mode?: string
  taux_honoraires?: number
  budget_estimatif?: number
  date_debut?: string
  date_fin_prevue?: string
  client?: Client
  partenaires?: Partenaire[]
  documents?: Document[]
  documents_count?: number
  completed_documents_count?: number
  partenaires_count?: number
  devis_count?: number
  factures_count?: number
  lots_count?: number
  phase_label?: string
  phase_progress?: number
  phase_alerts?: string[]
  phase_objectives?: string[]
  phase_checks_summary?: { label: string; done: boolean; alert: string }[]
  can_be_completed?: boolean
  created_at?: string
  updated_at?: string
}

export interface DocumentType {
  id: number
  code: string
  libelle: string
  phase: string
  nature: string
  emetteur_role?: string
  destinataire_roles?: string[]
  exclusive_group?: string
  workflow_config?: { status: string; actor: string }[]
  applicabilities?: { applicability: string; nature?: string }[]
}

export interface WorkflowStep {
  id: number
  from_status?: string
  to_status: string
  actor_role?: string
  commentaire?: string
  transitioned_at: string
  user?: User
}

export interface Document {
  id: number
  projet_id: number
  nom: string
  type_document: string
  phase?: string
  statut: string
  workflow_status: string
  due_at?: string
  archived_at?: string
  file_path?: string
  original_file_name?: string
  mime_type?: string
  file_size?: number
  version?: number
  montant_ht?: number
  montant_ttc?: number
  tva?: number
  projet?: Projet
  partenaire?: Partenaire
  document_type?: DocumentType
  workflow_steps?: WorkflowStep[]
}

export interface Pagination {
  limit: number
  cursor: string | null
  has_more: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}
