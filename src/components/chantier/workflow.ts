export interface StepDefinition {
  code: string
  label: string
  description: string
  documentTypes?: string[]
  keywords?: string[]
}

export interface PhaseDefinition {
  value: string
  shortLabel: string
  label: string
  accent: string
  soft: string
  border: string
  steps: StepDefinition[]
}

export const CHANTIER_PHASES: PhaseDefinition[] = [
  { value: 'non_classe', shortLabel: 'Non classé', label: 'Non classé', accent: 'bg-slate-700', soft: 'bg-slate-100 text-slate-700', border: 'border-slate-500', steps: [
    { code: 'classer-dossier', label: 'Classer le dossier', description: 'Identifier la phase de démarrage et classer le nouveau dossier.' },
  ] },
  { value: 'etude_faisabilite', shortLabel: 'Faisabilité', label: 'Faisabilité', accent: 'bg-blue-600', soft: 'bg-blue-50 text-blue-700', border: 'border-blue-500', steps: [
    { code: 'rdv-analyse', label: 'RDV initial + Programme', description: 'Programme client et informations du rendez-vous initial.' },
    { code: 'analyse-faisabilite', label: 'Analyse de faisabilité', description: 'Contraintes du site, urbanisme, technique, budget et conclusion.' },
    { code: 'devis-validation', label: 'Devis + Validation client', description: 'Devis d’honoraires MOE et accord du client.', documentTypes: ['devis', 'contrat'] },
    { code: 'esquisse-notice', label: 'Esquisse + Notice descriptive', description: 'Premières orientations architecturales, programme et notice.', documentTypes: ['plan'], keywords: ['esquisse', 'notice', 'esq'] },
    { code: 'consultation-artisans', label: 'Consultation artisans', description: 'Présélection des artisans et constitution des premières équipes.', documentTypes: ['devis'] },
    { code: 'comparatif-initial', label: 'Comparatif offres', description: 'Comparaison initiale des offres par lot et par artisan.', documentTypes: ['devis'] },
  ] },
  { value: 'consultation_entreprises', shortLabel: 'Dossier admin', label: 'Dossier administratif', accent: 'bg-emerald-600', soft: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-500', steps: [
    { code: 'honoraires-2', label: 'Validation honoraires ph.2', description: 'Suivi du devis d’honoraires de la phase administrative.', documentTypes: ['devis'] },
    { code: 'documents-client', label: 'Documents client', description: 'Pièces requises selon le type de client.', documentTypes: ['autre'] },
    { code: 'plans-admin', label: 'Plans PC / DP / AT', description: 'Plans et pièces graphiques du dossier administratif.', documentTypes: ['plan'] },
    { code: 'depot-instruction', label: 'Dépôt + Instruction', description: 'Récépissé, type de demande, purge, arrêté et suivi des délais.', keywords: ['recepisse', 'récépissé', 'arrêté', 'permis'] },
    { code: 'panneau', label: 'Panneau de chantier', description: 'Date d’affichage et preuve du panneau réglementaire.', documentTypes: ['photo'] },
  ] },
  { value: 'analyse_offres', shortLabel: 'DCE / Offre', label: 'DCE / Offre', accent: 'bg-amber-500', soft: 'bg-amber-50 text-amber-800', border: 'border-amber-500', steps: [
    { code: 'honoraires-3', label: 'Validation honoraires ph.3', description: 'Suivi du devis d’honoraires de la phase DCE.', documentTypes: ['devis'] },
    { code: 'equipes-consultation', label: 'Équipes + Consultation', description: 'Pièces DCE, équipes, envoi et suivi des réponses.', documentTypes: ['devis', 'plan'] },
    { code: 'comparatif-offres', label: 'Comparatif offres', description: 'Comparaison HT/TTC et analyse de conformité au CCTP.', documentTypes: ['devis'] },
    { code: 'selection-lots', label: 'Sélection finale par lot', description: 'Choix des entreprises retenues et notification des non-retenues.', documentTypes: ['devis'] },
    { code: 'devis-planning', label: 'Devis + Planning validés', description: 'Marché contresigné, acompte, planning et assurance.', documentTypes: ['devis', 'facture', 'assurance'] },
  ] },
  { value: 'chantier', shortLabel: 'Chantier', label: 'Chantier', accent: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700', border: 'border-orange-500', steps: [
    { code: 'honoraires-4', label: 'Validation honoraires ph.4', description: 'Suivi du devis d’honoraires de la phase chantier.', documentTypes: ['devis'] },
    { code: 'comptes-rendus', label: 'Comptes rendus', description: 'Rédaction, numérotation et diffusion des CR.', documentTypes: ['compte_rendu'] },
    { code: 'planning-plans', label: 'Planning + Plans', description: 'Planning en vigueur et diffusion des plans de chantier.', documentTypes: ['plan'] },
    { code: 'factures-avenants', label: 'Factures + Avenants', description: 'Situations de travaux, factures artisans et avenants.', documentTypes: ['facture'] },
  ] },
  { value: 'cloture', shortLabel: 'Clôture', label: 'Clôture', accent: 'bg-rose-600', soft: 'bg-rose-50 text-rose-700', border: 'border-rose-500', steps: [
    { code: 'reserves', label: 'Réserves + Levée', description: 'Réserves regroupées par artisan et suivi de leur levée.', keywords: ['réserve', 'reserve'] },
    { code: 'pv-reception', label: 'PV de réception', description: 'PV client et artisans avec suivi des signatures.', keywords: ['pv', 'réception', 'reception'] },
    { code: 'dac', label: 'DAC', description: 'Déclaration d’achèvement et de conformité.', keywords: ['dac', 'achèvement'] },
    { code: 'attestations-garanties', label: 'Attestations + Garanties', description: 'Attestations légales et échéances des garanties.', documentTypes: ['assurance'] },
    { code: 'photographe', label: 'Photographe', description: 'Date du rendez-vous photo et notes de préparation.', documentTypes: ['photo'] },
    { code: 'archivage', label: 'Archivage dossier', description: 'Constitution du dossier final et archivage complet.', keywords: ['doe', 'archive'] },
  ] },
]

export const phaseDefinition = (value?: string) => CHANTIER_PHASES.find((phase) => phase.value === value) ?? CHANTIER_PHASES[0]
export const phasePosition = (value?: string) => Math.max(0, CHANTIER_PHASES.findIndex((phase) => phase.value === value))
