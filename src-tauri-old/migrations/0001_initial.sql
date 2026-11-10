PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Mon agence',
  email TEXT NOT NULL DEFAULT 'local@pimoo.app',
  phone TEXT,
  company_name TEXT,
  siret TEXT,
  address TEXT,
  legal_mentions TEXT,
  email_signature TEXT,
  avatar_path TEXT,
  preferences TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO app_profile (id) VALUES (1);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT,
  civilite TEXT,
  type_client TEXT NOT NULL DEFAULT 'particulier',
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  entreprise_nom TEXT,
  kbis TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partenaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_partenaire TEXT NOT NULL DEFAULT 'artisan',
  nom_entreprise TEXT NOT NULL,
  activite TEXT,
  siret TEXT,
  email TEXT,
  telephone TEXT,
  adresse TEXT,
  attestation_validite TEXT,
  attestation_assurance_path TEXT,
  attestation_assurance_original_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  adresse TEXT,
  description TEXT,
  phase TEXT NOT NULL DEFAULT 'non_classe',
  statut TEXT NOT NULL DEFAULT 'actif',
  priority TEXT NOT NULL DEFAULT 'normal',
  sub_status TEXT,
  type_marche TEXT NOT NULL DEFAULT 'projet_simple',
  project_type TEXT NOT NULL DEFAULT 'renovation_extension',
  honoraires_mode TEXT,
  taux_honoraires REAL,
  budget_estimatif REAL,
  date_debut TEXT,
  date_fin_prevue TEXT,
  abandoned_at TEXT,
  abandoned_reason TEXT,
  archived_at TEXT,
  last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_client_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT,
  UNIQUE(projet_id, client_id)
);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  partenaire_id INTEGER NOT NULL REFERENCES partenaires(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'artisan',
  contact_role TEXT,
  statut_invitation TEXT NOT NULL DEFAULT 'acceptee',
  UNIQUE(projet_id, partenaire_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  partenaire_id INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  type_document TEXT NOT NULL DEFAULT 'autre',
  phase TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  workflow_status TEXT NOT NULL DEFAULT 'brouillon',
  file_path TEXT,
  original_file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  partenaire_id INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  artisan_nom TEXT,
  statut TEXT NOT NULL DEFAULT 'a_faire',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  lot_id INTEGER REFERENCES lots(id) ON DELETE SET NULL,
  partenaire_id INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  partenaire_nom TEXT,
  lot TEXT,
  type TEXT NOT NULL DEFAULT 'artisan',
  montant_ht REAL,
  montant_ttc REAL,
  taux_tva REAL,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  phase TEXT,
  date_butoir TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  partenaire_id INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  numero TEXT,
  type_facture TEXT NOT NULL DEFAULT 'facture_artisan',
  montant_ht REAL,
  montant_tva REAL,
  montant_ttc REAL,
  honoraires_moe REAL,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  date_emission TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  type_relance TEXT NOT NULL,
  destinataire_email TEXT NOT NULL,
  objet TEXT,
  message TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  scheduled_at TEXT,
  sent_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'a_faire',
  notes TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  confirmed_manually_at TEXT,
  UNIQUE(projet_id, phase, code)
);

CREATE TABLE IF NOT EXISTS permit_instructions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL UNIQUE REFERENCES projets(id) ON DELETE CASCADE,
  application_type TEXT,
  receipt_number TEXT,
  submitted_at TEXT,
  instruction_deadline TEXT,
  decision TEXT NOT NULL DEFAULT 'en_instruction',
  decision_at TEXT,
  order_reference TEXT,
  purge_at TEXT,
  appeal_deadline TEXT,
  sign_displayed_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS site_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  meeting_at TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'brouillon',
  sent_at TEXT,
  recipients TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_amendments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  partenaire_id INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  reference TEXT,
  title TEXT NOT NULL,
  amount_ht REAL,
  amount_ttc REAL,
  status TEXT NOT NULL DEFAULT 'propose',
  decided_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS project_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  partenaire_id INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  location TEXT,
  severity TEXT NOT NULL DEFAULT 'normale',
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'ouverte',
  lifted_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS project_warranties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  partenaire_id INTEGER REFERENCES partenaires(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS assistant_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER REFERENCES projets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'a_faire',
  postponed_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workload_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER REFERENCES projets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planifie'
);

CREATE TABLE IF NOT EXISTS project_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projet_id INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_phase ON projets(phase);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(projet_id);
CREATE INDEX IF NOT EXISTS idx_documents_phase ON documents(phase);
CREATE INDEX IF NOT EXISTS idx_devis_project ON devis(projet_id);
CREATE INDEX IF NOT EXISTS idx_lots_project ON lots(projet_id);
