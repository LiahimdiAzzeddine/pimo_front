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
  onboarding_completed?: boolean
  documents_path?: string
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
  document_id?: number; notes?: string; cctp_compliance?: 'a_verifier' | 'conforme' | 'non_conforme' | 'reserves'; compliance_notes?: string; created_at?: string
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

export interface TrackingStepDefinition {
  id: number
  code: string
  label: string
  description?: string
  component_type?: string
  position: number
}

export interface ProjectStep {
  id: number
  status: 'a_faire' | 'en_cours' | 'terminee' | 'sans_objet' | 'bloquee'
  notes?: string
  data?: Record<string, unknown>
  started_at?: string
  completed_at?: string
  confirmed_manually_at?: string
  confirmed_by?: number
  definition: TrackingStepDefinition
}

export interface TrackingPhaseDefinition {
  id: number
  code: string
  label: string
  color?: string
  position: number
}

export interface ProjectPhase {
  id: number
  status: 'a_faire' | 'en_cours' | 'terminee' | 'sans_objet' | 'bloquee'
  started_at?: string
  completed_at?: string
  definition: TrackingPhaseDefinition
  steps: ProjectStep[]
}

export interface ProjectActivity {
  id: number
  action: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface PermitInstruction {
  id: number
  projet_id: number
  application_type?: 'PC' | 'DP' | 'AT' | 'PA' | 'autre'
  receipt_number?: string
  submitted_at?: string
  instruction_deadline?: string
  decision: 'en_instruction' | 'accordee' | 'refusee' | 'pieces_complementaires'
  decision_at?: string
  order_reference?: string
  purge_at?: string
  appeal_deadline?: string
  sign_displayed_at?: string
  notes?: string
}

export interface SiteReportRecipient {
  id: number
  name: string
  email: string
  role?: string
  status: string
  sent_at?: string
}

export interface SiteReport {
  id: number
  projet_id: number
  number: number
  title: string
  meeting_at?: string
  content?: string
  status: 'brouillon' | 'envoye'
  sent_at?: string
  recipients: SiteReportRecipient[]
}

export interface ProjectAmendment {
  id: number
  projet_id: number
  partenaire_id?: number
  reference?: string
  title: string
  amount_ht?: number
  amount_ttc?: number
  status: 'propose' | 'valide' | 'refuse' | 'signe'
  decided_at?: string
  notes?: string
  partenaire?: Partenaire
}

export interface ProjectReservation { id: number; projet_id: number; partenaire_id?: number; description: string; location?: string; severity: 'mineure' | 'normale' | 'critique'; due_at?: string; status: 'ouverte' | 'en_cours' | 'levee'; lifted_at?: string; notes?: string; partenaire?: Partenaire }
export interface ProjectWarranty { id: number; projet_id: number; partenaire_id?: number; type: 'parfait_achevement' | 'biennale' | 'decennale' | 'autre'; starts_at: string; ends_at: string; notes?: string; partenaire?: Partenaire }
export interface AssistantItem { id: number; projet_id?: number; type: 'urgence' | 'decision' | 'suggestion' | 'mail'; title: string; details?: string; due_at?: string; status: string; postponed_until?: string; projet?: Pick<Projet, 'id' | 'nom'> }
export interface WorkloadBlock { id: number; projet_id?: number; title: string; starts_at: string; ends_at: string; status: string; projet?: Pick<Projet, 'id' | 'nom'> }

export interface Projet {
  id: number
  nom: string
  adresse?: string
  description?: string
  phase: string
  statut: string
  priority?: 'normal' | 'sensible' | 'critique'
  sub_status?: string
  last_activity_at?: string
  abandoned_at?: string
  abandoned_reason?: string
  archived_at?: string
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
  devis?: Devis[]
  lots?: Lot[]
  factures?: Facture[]
  relances?: Relance[]
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
  tracking_phases?: ProjectPhase[]
  activities?: ProjectActivity[]
  permit_instruction?: PermitInstruction
  site_reports?: SiteReport[]
  amendments?: ProjectAmendment[]
  reservations?: ProjectReservation[]
  warranties?: ProjectWarranty[]
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

export interface OcrAnalysis {
  id: number
  document_id: number
  provider: string
  statut: 'pending' | 'processing' | 'completed' | 'failed'
  detected_type?: 'devis' | 'facture' | 'autre'
  montant_ht?: number
  montant_ttc?: number
  tva?: number
  confidence_score?: number
  error_message?: string
  processed_at?: string
}

export interface Document {
  id: number
  projet_id: number
  nom: string
  type_document: string
  phase?: string
  statut: string
  workflow_status: string
  project_step_id?: number
  detection_source?: 'not_detected' | 'manual' | 'automatic_confirmed'
  external_provider?: string
  external_reference?: string
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
  ocr_analyses?: OcrAnalysis[]
  project_step?: ProjectStep
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
