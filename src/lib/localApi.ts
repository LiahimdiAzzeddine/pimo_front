import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { CHANTIER_PHASES } from '@/components/chantier/workflow'
import { execute, first, insert, now, parseJson, select } from './localDb'
import { ensureNamedProjectDirectories, migrateAllProjectDocuments, readLocalDocument, removeLocalDocument, storeLocalDocument } from './localFiles'

type Row = Record<string, unknown>

const permissions = [
  'platform.moe.access', 'projects.manage', 'clients.manage', 'partners.manage', 'documents.manage',
  'consultations.manage', 'finances.manage', 'reminders.manage',
]

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  const result = { data, status, statusText: status === 200 ? 'OK' : 'Created', headers: {}, config, request: null } as AxiosResponse
  if (status >= 400) throw new AxiosError((data as { message?: string })?.message ?? 'Erreur locale', AxiosError.ERR_BAD_REQUEST, config, null, result)
  return result
}

function body(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (config.data instanceof FormData) return Object.fromEntries(config.data.entries())
  if (typeof config.data === 'string') {
    try { return JSON.parse(config.data) as Record<string, unknown> } catch { return {} }
  }
  return (config.data ?? {}) as Record<string, unknown>
}

function pagination<T>(data: T[]) {
  return { data, pagination: { limit: data.length, cursor: null, has_more: false } }
}

function sqlFields(payload: Record<string, unknown>, allowed: string[]) {
  const entries = Object.entries(payload).filter(([key]) => allowed.includes(key))
  return {
    columns: entries.map(([key]) => key),
    values: entries.map(([, value]) => value == null ? null : typeof value === 'object' ? JSON.stringify(value) : String(value)),
  }
}

async function localUser() {
  const profile = await first<Row>('SELECT * FROM app_profile WHERE id = 1') ?? { id: 1, name: 'Mon agence', email: 'local@pimoo.app' }
  return {
    ...profile,
    status: 'active',
    roles: [{ name: 'moe' }],
    effective_permissions: permissions,
    preferences: parseJson(profile.preferences, {}),
    avatar_url: profile.avatar_path || undefined,
    onboarding_completed: Number(profile.onboarding_completed ?? 0) === 1,
    email_verified_at: profile.created_at,
  }
}

async function clients(url: URL) {
  const search = url.searchParams.get('search')?.trim()
  const type = url.searchParams.get('type_client')
  const clauses: string[] = []
  const values: (string | number | null)[] = []
  if (search) { clauses.push('(nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ? OR entreprise_nom LIKE ?)'); values.push(...Array(5).fill(`%${search}%`)) }
  if (type) { clauses.push('type_client = ?'); values.push(type) }
  const rows = await select<Row>(`SELECT * FROM clients ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY updated_at DESC`, values)
  return Promise.all(rows.map(async (client) => {
    const projects = await select<Row>('SELECT id, nom FROM projets WHERE client_id = ? OR id IN (SELECT projet_id FROM project_client_contacts WHERE client_id = ?)', [Number(client.id), Number(client.id)])
    return { ...client, projets: projects, projets_count: projects.length }
  }))
}

async function partners(url: URL) {
  const search = url.searchParams.get('search')?.trim()
  const type = url.searchParams.get('type_partenaire')
  const clauses: string[] = []
  const values: (string | number | null)[] = []
  if (search) { clauses.push('(nom_entreprise LIKE ? OR activite LIKE ? OR siret LIKE ? OR email LIKE ? OR telephone LIKE ?)'); values.push(...Array(5).fill(`%${search}%`)) }
  if (type) { clauses.push('type_partenaire = ?'); values.push(type) }
  const rows = await select<Row>(`SELECT * FROM partenaires ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY updated_at DESC`, values)
  return Promise.all(rows.map(async (partner) => ({
    ...partner,
    projets_count: Number((await first<Row>('SELECT COUNT(*) count FROM project_members WHERE partenaire_id = ?', [Number(partner.id)]))?.count ?? 0),
    devis_count: Number((await first<Row>('SELECT COUNT(*) count FROM devis WHERE partenaire_id = ?', [Number(partner.id)]))?.count ?? 0),
  })))
}

async function hydrateProject(project: Row): Promise<Row> {
  const id = Number(project.id)
  const client = project.client_id ? await first<Row>('SELECT * FROM clients WHERE id = ?', [Number(project.client_id)]) : undefined
  const partenaires = await select<Row>('SELECT p.*, pm.role, pm.contact_role FROM partenaires p JOIN project_members pm ON pm.partenaire_id = p.id WHERE pm.projet_id = ?', [id])
  const documents: Row[] = (await select<Row>('SELECT * FROM documents WHERE projet_id = ? ORDER BY updated_at DESC', [id])).map((item) => ({ ...item, metadata: parseJson(item.metadata, {}) }))
  const lots = await select<Row>('SELECT l.*, p.nom_entreprise partenaire_nom FROM lots l LEFT JOIN partenaires p ON p.id = l.partenaire_id WHERE l.projet_id = ? ORDER BY l.id', [id])
  const devis = await select<Row>('SELECT d.*, p.nom_entreprise partenaire_entreprise, l.nom lot_reference_nom FROM devis d LEFT JOIN partenaires p ON p.id=d.partenaire_id LEFT JOIN lots l ON l.id=d.lot_id WHERE d.projet_id=? ORDER BY d.id DESC', [id])
  const factures = await select<Row>('SELECT * FROM factures WHERE projet_id = ? ORDER BY id DESC', [id])
  const relances = await select<Row>('SELECT * FROM relances WHERE projet_id = ? ORDER BY id DESC', [id])
  const permit = await first<Row>('SELECT * FROM permit_instructions WHERE projet_id = ?', [id])
  const siteReports = (await select<Row>('SELECT * FROM site_reports WHERE projet_id = ? ORDER BY number DESC', [id])).map((item) => ({ ...item, recipients: parseJson(item.recipients, []) }))
  const amendments = await select<Row>('SELECT * FROM project_amendments WHERE projet_id = ? ORDER BY id DESC', [id])
  const reservations = await select<Row>('SELECT * FROM project_reservations WHERE projet_id = ? ORDER BY id DESC', [id])
  const warranties = await select<Row>('SELECT * FROM project_warranties WHERE projet_id = ? ORDER BY ends_at', [id])
  const steps: Row[] = (await select<Row>('SELECT * FROM project_steps WHERE projet_id = ? ORDER BY phase, position', [id])).map((step) => ({ ...step, data: parseJson(step.data, {}), definition: { id: step.id, code: step.code, label: step.label, description: step.description, position: step.position } }))
  const tracking_phases = CHANTIER_PHASES.map((phase, index) => ({ id: index + 1, status: project.phase === phase.value ? 'en_cours' : 'a_faire', definition: { id: index + 1, code: phase.value, label: phase.label, color: phase.accent, position: index }, steps: steps.filter((step) => step.phase === phase.value) }))
  return {
    ...project, client, partenaires, documents,
    lots: lots.map((lot) => ({ ...lot, partenaire: lot.partenaire_id ? partenaires.find((p) => p.id === lot.partenaire_id) : undefined })),
    devis: devis.map((quote) => ({ ...quote, partenaire: quote.partenaire_id ? partenaires.find((p) => p.id === quote.partenaire_id) : undefined, lot_reference: quote.lot_id ? { id: quote.lot_id, nom: quote.lot_reference_nom } : undefined })),
    factures, relances, permit_instruction: permit, site_reports: siteReports, amendments, reservations, warranties, tracking_phases,
    documents_count: documents.length,
    completed_documents_count: documents.filter((document) => ['valide', 'signe', 'archive'].includes(String(document.workflow_status))).length,
    partenaires_count: partenaires.length, devis_count: devis.length, factures_count: factures.length, lots_count: lots.length,
    phase_alerts: [], phase_objectives: [], phase_checks_summary: [], can_be_completed: false,
  }
}

async function projects(url: URL) {
  const clauses = ["statut != 'archive'"]
  const values: (string | number | null)[] = []
  const search = url.searchParams.get('search')?.trim()
  if (search) { clauses.push('(nom LIKE ? OR adresse LIKE ?)'); values.push(`%${search}%`, `%${search}%`) }
  if (url.searchParams.get('phase')) { clauses.push('phase = ?'); values.push(url.searchParams.get('phase')) }
  if (url.searchParams.get('statut')) { clauses.push('statut = ?'); values.push(url.searchParams.get('statut')) }
  const rows = await select<Row>(`SELECT * FROM projets WHERE ${clauses.join(' AND ')} ORDER BY last_activity_at DESC`, values)
  return Promise.all(rows.map(hydrateProject))
}

async function createSteps(projectId: number) {
  for (const phase of CHANTIER_PHASES) {
    for (const [position, step] of phase.steps.entries()) {
      await execute('INSERT OR IGNORE INTO project_steps (projet_id, phase, code, label, description, position) VALUES (?, ?, ?, ?, ?, ?)', [projectId, phase.value, step.code.replaceAll('-', '_'), step.label, step.description, position])
    }
  }
}

async function createRecord(table: string, payload: Record<string, unknown>, allowed: string[]) {
  const fields = sqlFields(payload, allowed)
  if (!fields.columns.length) throw new Error('Aucune donnée à enregistrer.')
  const placeholders = fields.columns.map(() => '?').join(', ')
  const id = await insert(`INSERT INTO ${table} (${fields.columns.join(', ')}) VALUES (${placeholders})`, fields.values)
  return first<Row>(`SELECT * FROM ${table} WHERE id = ?`, [id])
}

async function updateRecord(table: string, id: number, payload: Record<string, unknown>, allowed: string[]) {
  const fields = sqlFields(payload, allowed)
  if (fields.columns.length) await execute(`UPDATE ${table} SET ${fields.columns.map((column) => `${column} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...fields.values, id])
  return first<Row>(`SELECT * FROM ${table} WHERE id = ?`, [id])
}

async function projectContacts(projectId: number) {
  const clientRows = await select<Row>('SELECT c.*, pc.id, pc.client_id source_id, pc.role FROM project_client_contacts pc JOIN clients c ON c.id=pc.client_id WHERE pc.projet_id=?', [projectId])
  const project = await first<Row>('SELECT client_id FROM projets WHERE id=?', [projectId])
  const memberRows = await select<Row>('SELECT p.*, pm.id, pm.partenaire_id source_id, pm.role member_role, pm.contact_role role FROM project_members pm JOIN partenaires p ON p.id=pm.partenaire_id WHERE pm.projet_id=?', [projectId])
  const clients = clientRows.map((item) => ({ ...item, kind: 'client', category: 'client', nom: `${item.prenom ?? ''} ${item.nom}`.trim(), is_primary: project?.client_id === item.source_id }))
  const members = memberRows.map((item) => ({ ...item, kind: 'member', category: item.member_role === 'artisan' ? 'artisan' : 'autre', nom: item.nom_entreprise, role: item.role ?? item.member_role }))
  return { clients, artisans: members.filter((item) => item.category === 'artisan'), others: members.filter((item) => item.category === 'autre') }
}

const clientFields = ['nom', 'prenom', 'civilite', 'type_client', 'email', 'telephone', 'adresse', 'entreprise_nom', 'kbis', 'notes']
const partnerFields = ['type_partenaire', 'nom_entreprise', 'activite', 'siret', 'email', 'telephone', 'adresse', 'attestation_validite', 'notes']
const projectFields = ['client_id', 'nom', 'adresse', 'description', 'phase', 'statut', 'priority', 'sub_status', 'type_marche', 'project_type', 'honoraires_mode', 'taux_honoraires', 'budget_estimatif', 'date_debut', 'date_fin_prevue', 'abandoned_reason']
const resourceMap: Record<string, { table: string; fields: string[] }> = {
  factures: { table: 'factures', fields: ['projet_id', 'partenaire_id', 'client_id', 'numero', 'type_facture', 'montant_ht', 'montant_tva', 'montant_ttc', 'honoraires_moe', 'statut', 'date_emission'] },
  relances: { table: 'relances', fields: ['projet_id', 'type_relance', 'destinataire_email', 'objet', 'message', 'statut', 'scheduled_at', 'sent_at', 'attempts'] },
  devis: { table: 'devis', fields: ['projet_id', 'lot_id', 'partenaire_id', 'document_id', 'partenaire_nom', 'lot', 'type', 'montant_ht', 'montant_ttc', 'taux_tva', 'statut', 'phase', 'date_butoir', 'notes', 'cctp_compliance', 'compliance_notes'] },
}

async function localRoute(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method ?? 'get').toLowerCase()
  const url = new URL(config.url ?? '/', 'http://pimoo.local')
  if (config.params) Object.entries(config.params).forEach(([key, value]) => value != null && url.searchParams.set(key, String(value)))
  const path = url.pathname.replace(/^\/api/, '')
  const data = body(config)

  await ensureNamedProjectDirectories().catch((error) => console.warn('Migration des dossiers de projets différée.', error))

  if (path === '/auth/me' || path === '/auth/login') return response(config, path.endsWith('login') ? { token: 'local-device', user: await localUser() } : await localUser())
  if (path === '/auth/logout' || path === '/auth/logout-all' || path === '/auth/password') return response(config, { message: 'Action locale effectuée.' })
  if (path === '/auth/profile' && method === 'patch') {
    const fields = sqlFields(data, ['name', 'email', 'phone', 'company_name', 'siret', 'address', 'legal_mentions', 'email_signature', 'preferences'])
    if (fields.columns.length) await execute(`UPDATE app_profile SET ${fields.columns.map((column) => `${column}=?`).join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=1`, fields.values)
    return response(config, { message: 'Profil enregistré localement.', user: await localUser() })
  }
  if (path === '/auth/profile/avatar' && method === 'post') {
    const file = data.avatar as File
    if (!(file instanceof File) || file.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return response(config, { message: 'Image invalide ou supérieure à 2 Mo.' }, 422)
    const avatar = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
    await execute('UPDATE app_profile SET avatar_path=?, updated_at=CURRENT_TIMESTAMP WHERE id=1', [avatar])
    return response(config, { message: 'Logo enregistré sur cet appareil.', user: await localUser() })
  }
  if (path === '/local/setup' && method === 'post') {
    const required = ['name', 'email', 'documents_path']
    if (required.some((field) => !String(data[field] ?? '').trim())) return response(config, { message: 'Le nom, l’adresse e-mail et le dossier des documents sont obligatoires.' }, 422)
    const fields = sqlFields(data, ['name', 'email', 'phone', 'company_name', 'siret', 'address', 'documents_path'])
    await execute(`UPDATE app_profile SET ${fields.columns.map((column) => `${column}=?`).join(', ')}, onboarding_completed=1, updated_at=CURRENT_TIMESTAMP WHERE id=1`, fields.values)
    return response(config, { message: 'Configuration terminée.', user: await localUser() })
  }

  if (path === '/dashboard') {
    const recent = (await projects(new URL('http://local/projets'))).slice(0, 20)
    const documents = await select<Row>("SELECT * FROM documents WHERE workflow_status NOT IN ('valide','signe','archive') ORDER BY updated_at DESC LIMIT 10")
    const reminders = await select<Row>("SELECT * FROM relances WHERE statut != 'envoyee' ORDER BY scheduled_at LIMIT 10")
    const outstanding = await first<Row>("SELECT COALESCE(SUM(montant_ttc), 0) total FROM factures WHERE statut != 'payee'")
    return response(config, { stats: { active_projects: recent.filter((item) => item.statut === 'actif').length, waiting_actions: reminders.length, completed_documents: Number((await first<Row>("SELECT COUNT(*) count FROM documents WHERE workflow_status IN ('valide','signe','archive')"))?.count ?? 0), outstanding_amount: Number(outstanding?.total ?? 0), scheduled_reminders: reminders.length, deadlines_at_risk: 0 }, recent_projects: recent, alerts: { reminders, documents } })
  }

  if (path === '/clients' && method === 'get') return response(config, pagination(await clients(url)))
  if (path === '/clients' && method === 'post') return response(config, await createRecord('clients', { type_client: 'particulier', ...data }, clientFields), 201)
  const clientMatch = path.match(/^\/clients\/(\d+)$/)
  if (clientMatch) {
    const id = Number(clientMatch[1])
    if (method === 'get') return response(config, await first<Row>('SELECT * FROM clients WHERE id=?', [id]))
    if (method === 'patch') return response(config, await updateRecord('clients', id, data, clientFields))
    if (method === 'delete') { await execute('DELETE FROM clients WHERE id=?', [id]); return response(config, { message: 'Client supprimé.' }) }
  }

  if (path === '/partenaires' && method === 'get') return response(config, pagination(await partners(url)))
  if (path === '/partenaires' && method === 'post') return response(config, await createRecord('partenaires', { type_partenaire: 'artisan', ...data }, partnerFields), 201)
  const partnerMatch = path.match(/^\/partenaires\/(\d+)$/)
  if (partnerMatch) {
    const id = Number(partnerMatch[1])
    if (method === 'get') return response(config, await first<Row>('SELECT * FROM partenaires WHERE id=?', [id]))
    if (method === 'patch') return response(config, await updateRecord('partenaires', id, data, partnerFields))
    if (method === 'delete') { await execute('DELETE FROM partenaires WHERE id=?', [id]); return response(config, { message: 'Partenaire supprimé.' }) }
  }

  if (path === '/projets' && method === 'get') return response(config, pagination(await projects(url)))
  if (path === '/projets' && method === 'post') {
    const created = await createRecord('projets', { phase: 'non_classe', statut: 'actif', priority: 'normal', ...data, last_activity_at: now() }, [...projectFields, 'last_activity_at'])
    const id = Number(created?.id)
    if (data.client_id) await execute('INSERT OR IGNORE INTO project_client_contacts (projet_id, client_id) VALUES (?, ?)', [id, Number(data.client_id)])
    await createSteps(id)
    return response(config, await hydrateProject(created!), 201)
  }
  const projectMatch = path.match(/^\/projets\/(\d+)$/)
  if (projectMatch) {
    const id = Number(projectMatch[1])
    if (method === 'get') { const row = await first<Row>('SELECT * FROM projets WHERE id=?', [id]); return response(config, row ? await hydrateProject(row) : null, row ? 200 : 404) }
    if (method === 'patch') { const row = await updateRecord('projets', id, { ...data, last_activity_at: now() }, [...projectFields, 'last_activity_at']); if (data.client_id) await execute('INSERT OR IGNORE INTO project_client_contacts (projet_id, client_id) VALUES (?, ?)', [id, Number(data.client_id)]); if (typeof data.nom === 'string') await migrateAllProjectDocuments(); return response(config, await hydrateProject(row!)) }
    if (method === 'delete') { const docs = await select<Row>('SELECT file_path FROM documents WHERE projet_id=?', [id]); await Promise.all(docs.map((doc) => removeLocalDocument(String(doc.file_path ?? '')))); await execute('DELETE FROM projets WHERE id=?', [id]); await migrateAllProjectDocuments(); return response(config, { message: 'Projet supprimé.' }) }
  }

  const contactsMatch = path.match(/^\/projets\/(\d+)\/contacts(?:\/(client|member)\/(\d+))?$/)
  if (contactsMatch) {
    const projectId = Number(contactsMatch[1])
    if (method === 'get') return response(config, await projectContacts(projectId))
    if (method === 'post') {
      if (data.category === 'client') {
        const clientId = data.source_id ? Number(data.source_id) : Number((await createRecord('clients', { nom: data.nom, email: data.email, telephone: data.telephone, type_client: 'particulier' }, clientFields))?.id)
        const id = await insert('INSERT OR IGNORE INTO project_client_contacts (projet_id, client_id, role) VALUES (?, ?, ?)', [projectId, clientId, String(data.role ?? '')])
        const project = await first<Row>('SELECT client_id FROM projets WHERE id=?', [projectId]); if (!project?.client_id) await execute('UPDATE projets SET client_id=? WHERE id=?', [clientId, projectId])
        return response(config, { id }, 201)
      }
      const partnerId = data.source_id ? Number(data.source_id) : Number((await createRecord('partenaires', { nom_entreprise: data.nom, email: data.email, telephone: data.telephone, type_partenaire: data.category === 'artisan' ? 'artisan' : String(data.member_role ?? 'autre') }, partnerFields))?.id)
      const id = await insert('INSERT OR IGNORE INTO project_members (projet_id, partenaire_id, role, contact_role) VALUES (?, ?, ?, ?)', [projectId, partnerId, data.category === 'artisan' ? 'artisan' : String(data.member_role ?? 'autre'), String(data.role ?? '')])
      return response(config, { id }, 201)
    }
    const kind = contactsMatch[2]; const id = Number(contactsMatch[3])
    if (method === 'delete') { await execute(`DELETE FROM ${kind === 'client' ? 'project_client_contacts' : 'project_members'} WHERE id=? AND projet_id=?`, [id, projectId]); return response(config, { message: 'Contact retiré.' }) }
    if (method === 'patch') {
      if (kind === 'client') { const link = await first<Row>('SELECT client_id FROM project_client_contacts WHERE id=?', [id]); if (link) await updateRecord('clients', Number(link.client_id), data, ['nom', 'email', 'telephone']); if ('role' in data) await execute('UPDATE project_client_contacts SET role=? WHERE id=?', [String(data.role ?? ''), id]) }
      else { const link = await first<Row>('SELECT partenaire_id FROM project_members WHERE id=?', [id]); if (link) await updateRecord('partenaires', Number(link.partenaire_id), { nom_entreprise: data.nom, email: data.email, telephone: data.telephone }, ['nom_entreprise', 'email', 'telephone']); await execute('UPDATE project_members SET contact_role=?, role=COALESCE(?, role) WHERE id=?', [String(data.role ?? ''), data.member_role ? String(data.member_role) : null, id]) }
      return response(config, { message: 'Contact modifié.' })
    }
  }

  const projectLotsMatch = path.match(/^\/projets\/(\d+)\/lots$/)
  if (projectLotsMatch) {
    const projectId = Number(projectLotsMatch[1])
    if (method === 'get') {
      const rows = await select<Row>('SELECT l.*, p.nom_entreprise partenaire_nom, (SELECT COUNT(*) FROM devis d WHERE d.lot_id=l.id) devis_count FROM lots l LEFT JOIN partenaires p ON p.id=l.partenaire_id WHERE l.projet_id=? ORDER BY l.id', [projectId])
      return response(config, rows)
    }
    if (method === 'post') return response(config, await createRecord('lots', { projet_id: projectId, statut: 'a_faire', ...data }, ['projet_id', 'partenaire_id', 'nom', 'artisan_nom', 'statut']), 201)
  }
  const lotMatch = path.match(/^\/lots\/(\d+)(?:\/(attribuer|consulter))?$/)
  if (lotMatch) {
    const id = Number(lotMatch[1]); const action = lotMatch[2]
    if (action === 'attribuer' && method === 'post') {
      const quote = await first<Row>('SELECT partenaire_id, partenaire_nom FROM devis WHERE id=? AND lot_id=?', [Number(data.devis_id), id])
      await execute("UPDATE lots SET partenaire_id=?, artisan_nom=COALESCE(?, artisan_nom), statut='valide', updated_at=CURRENT_TIMESTAMP WHERE id=?", [quote?.partenaire_id ? Number(quote.partenaire_id) : null, quote?.partenaire_nom ? String(quote.partenaire_nom) : null, id])
      await execute("UPDATE devis SET statut=CASE WHEN id=? THEN 'valide' ELSE 'refuse' END, updated_at=CURRENT_TIMESTAMP WHERE lot_id=?", [Number(data.devis_id), id])
      return response(config, await first<Row>('SELECT * FROM lots WHERE id=?', [id]))
    }
    if (action === 'consulter' && method === 'post') {
      await execute("UPDATE lots SET statut='en_cours', updated_at=CURRENT_TIMESTAMP WHERE id=?", [id])
      return response(config, { message: 'Consultation préparée localement. Aucun e-mail n’a été envoyé.', envoyees: [], deja_consultees: [], echecs: [] })
    }
    if (!action && method === 'patch') return response(config, await updateRecord('lots', id, data, ['partenaire_id', 'nom', 'artisan_nom', 'statut']))
    if (!action && method === 'delete') { await execute('DELETE FROM lots WHERE id=?', [id]); return response(config, { message: 'Lot supprimé.' }) }
  }

  const checklistMatch = path.match(/^\/projets\/(\d+)\/checklist$/)
  if (checklistMatch && method === 'get') return response(config, { data: await select<Row>('SELECT * FROM documents WHERE projet_id=? ORDER BY updated_at DESC', [Number(checklistMatch[1])]) })

  const transitionMatch = path.match(/^\/documents\/(\d+)\/transition$/)
  if (transitionMatch && method === 'post') {
    await execute('UPDATE documents SET workflow_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [String(data.status ?? 'brouillon'), Number(transitionMatch[1])])
    return response(config, await first<Row>('SELECT * FROM documents WHERE id=?', [Number(transitionMatch[1])]))
  }

  const stepMatch = path.match(/^\/project-steps\/(\d+)\/(status|confirm-manually)$/)
  if (stepMatch) {
    const id = Number(stepMatch[1])
    if (stepMatch[2] === 'status' && method === 'patch') {
      await execute('UPDATE project_steps SET status=COALESCE(?, status), notes=COALESCE(?, notes), data=COALESCE(?, data) WHERE id=?', [data.status ? String(data.status) : null, data.notes == null ? null : String(data.notes), data.data == null ? null : JSON.stringify(data.data), id])
    } else if (stepMatch[2] === 'confirm-manually' && method === 'post') {
      await execute("UPDATE project_steps SET status='terminee', confirmed_manually_at=CURRENT_TIMESTAMP WHERE id=?", [id])
    }
    return response(config, await first<Row>('SELECT * FROM project_steps WHERE id=?', [id]))
  }

  const permitMatch = path.match(/^\/projets\/(\d+)\/permit-instruction$/)
  if (permitMatch && method === 'put') {
    const projectId = Number(permitMatch[1])
    const allowed = ['application_type', 'receipt_number', 'submitted_at', 'instruction_deadline', 'decision', 'decision_at', 'order_reference', 'purge_at', 'appeal_deadline', 'sign_displayed_at', 'notes']
    await execute('INSERT OR IGNORE INTO permit_instructions (projet_id) VALUES (?)', [projectId])
    const fields = sqlFields(data, allowed)
    if (fields.columns.length) await execute(`UPDATE permit_instructions SET ${fields.columns.map((column) => `${column}=?`).join(', ')} WHERE projet_id=?`, [...fields.values, projectId])
    return response(config, await first<Row>('SELECT * FROM permit_instructions WHERE projet_id=?', [projectId]))
  }

  const reportsMatch = path.match(/^\/projets\/(\d+)\/site-reports$/)
  if (reportsMatch && method === 'post') {
    const projectId = Number(reportsMatch[1])
    const next = Number((await first<Row>('SELECT COALESCE(MAX(number),0)+1 number FROM site_reports WHERE projet_id=?', [projectId]))?.number ?? 1)
    return response(config, await createRecord('site_reports', { projet_id: projectId, number: next, status: 'brouillon', ...data }, ['projet_id', 'number', 'title', 'meeting_at', 'content', 'status', 'sent_at', 'recipients']), 201)
  }
  const sendReportMatch = path.match(/^\/site-reports\/(\d+)\/send$/)
  if (sendReportMatch && method === 'post') {
    await execute("UPDATE site_reports SET status='envoye', sent_at=CURRENT_TIMESTAMP WHERE id=?", [Number(sendReportMatch[1])])
    return response(config, { message: 'Compte rendu marqué comme envoyé localement.' })
  }

  const amendmentCreateMatch = path.match(/^\/projets\/(\d+)\/amendments$/)
  if (amendmentCreateMatch && method === 'post') return response(config, await createRecord('project_amendments', { projet_id: Number(amendmentCreateMatch[1]), status: 'propose', ...data }, ['projet_id', 'partenaire_id', 'reference', 'title', 'amount_ht', 'amount_ttc', 'status', 'decided_at', 'notes']), 201)
  const amendmentMatch = path.match(/^\/project-amendments\/(\d+)$/)
  if (amendmentMatch && method === 'patch') {
    const fields = sqlFields(data, ['partenaire_id', 'reference', 'title', 'amount_ht', 'amount_ttc', 'status', 'decided_at', 'notes'])
    if (fields.columns.length) await execute(`UPDATE project_amendments SET ${fields.columns.map((column) => `${column}=?`).join(', ')} WHERE id=?`, [...fields.values, Number(amendmentMatch[1])])
    return response(config, await first<Row>('SELECT * FROM project_amendments WHERE id=?', [Number(amendmentMatch[1])]))
  }

  const reservationCreateMatch = path.match(/^\/projets\/(\d+)\/reservations$/)
  if (reservationCreateMatch && method === 'post') return response(config, await createRecord('project_reservations', { projet_id: Number(reservationCreateMatch[1]), severity: 'normale', status: 'ouverte', ...data }, ['projet_id', 'partenaire_id', 'description', 'location', 'severity', 'due_at', 'status', 'lifted_at', 'notes']), 201)
  const reservationMatch = path.match(/^\/project-reservations\/(\d+)$/)
  if (reservationMatch && method === 'patch') {
    const fields = sqlFields(data, ['partenaire_id', 'description', 'location', 'severity', 'due_at', 'status', 'lifted_at', 'notes'])
    if (fields.columns.length) await execute(`UPDATE project_reservations SET ${fields.columns.map((column) => `${column}=?`).join(', ')} WHERE id=?`, [...fields.values, Number(reservationMatch[1])])
    return response(config, await first<Row>('SELECT * FROM project_reservations WHERE id=?', [Number(reservationMatch[1])]))
  }

  const warrantyMatch = path.match(/^\/projets\/(\d+)\/warranties$/)
  if (warrantyMatch && method === 'post') return response(config, await createRecord('project_warranties', { projet_id: Number(warrantyMatch[1]), ...data }, ['projet_id', 'partenaire_id', 'type', 'starts_at', 'ends_at', 'notes']), 201)

  const assistantMatch = path.match(/^\/assistant\/items(?:\/(\d+))?$/)
  if (assistantMatch) {
    if (!assistantMatch[1] && method === 'post') return response(config, await createRecord('assistant_items', { status: 'a_faire', ...data }, ['projet_id', 'type', 'title', 'details', 'due_at', 'status', 'postponed_until']), 201)
    if (assistantMatch[1] && method === 'patch') {
      const fields = sqlFields(data, ['projet_id', 'type', 'title', 'details', 'due_at', 'status', 'postponed_until'])
      if (fields.columns.length) await execute(`UPDATE assistant_items SET ${fields.columns.map((column) => `${column}=?`).join(', ')} WHERE id=?`, [...fields.values, Number(assistantMatch[1])])
      return response(config, await first<Row>('SELECT * FROM assistant_items WHERE id=?', [Number(assistantMatch[1])]))
    }
  }
  const timeMatch = path.match(/^\/projets\/(\d+)\/time-entries$/)
  if (timeMatch && method === 'post') return response(config, await createRecord('time_entries', { projet_id: Number(timeMatch[1]), ...data }, ['projet_id', 'action', 'minutes', 'occurred_at']), 201)
  if (path === '/assistant/workload-blocks' && method === 'post') return response(config, await createRecord('workload_blocks', { status: 'planifie', ...data }, ['projet_id', 'title', 'starts_at', 'ends_at', 'status']), 201)

  const projectActionMatch = path.match(/^\/projets\/(\d+)\/(sans-suite|archive)$/)
  if (projectActionMatch && method === 'post') {
    const id = Number(projectActionMatch[1])
    if (projectActionMatch[2] === 'archive') await execute("UPDATE projets SET statut='archive', archived_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?", [id])
    else await execute("UPDATE projets SET statut='sans_suite', abandoned_at=CURRENT_TIMESTAMP, abandoned_reason=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [String(data.reason ?? ''), id])
    return response(config, { message: 'Projet mis à jour.' })
  }

  if (path === '/automation/storage-status' && method === 'get') return response(config, { default_disk: 'local', cloud_ready: false })

  if (path === '/documents' && method === 'get') return response(config, pagination(await select<Row>('SELECT d.*, p.nom projet_nom FROM documents d LEFT JOIN projets p ON p.id=d.projet_id ORDER BY d.updated_at DESC')))
  if ((path === '/upload' || path.match(/^\/documents\/\d+\/file$/)) && method === 'post') {
    const file = data.file as File
    const existingId = Number(path.match(/^\/documents\/(\d+)\/file$/)?.[1] ?? 0)
    const existing = existingId ? await first<Row>('SELECT projet_id, nom, file_path FROM documents WHERE id=?', [existingId]) : undefined
    const projectId = Number(data.projet_id ?? existing?.projet_id ?? 0)
    if (!(file instanceof File) || !projectId) return response(config, { message: 'Fichier ou projet manquant.' }, 422)
    const filePath = await storeLocalDocument(projectId, file, String(data.nom ?? existing?.nom ?? file.name), existingId)
    if (existingId) { const previousPath = String(existing?.file_path ?? ''); if (previousPath.replaceAll('\\', '/').toLocaleLowerCase() !== filePath.replaceAll('\\', '/').toLocaleLowerCase()) await removeLocalDocument(previousPath); await execute('UPDATE documents SET file_path=?, original_file_name=?, mime_type=?, file_size=?, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE id=?', [filePath, file.name, file.type, file.size, existingId]); return response(config, { document: await first<Row>('SELECT * FROM documents WHERE id=?', [existingId]) }) }
    const document = await createRecord('documents', { projet_id: projectId, nom: data.nom ?? file.name, type_document: data.type_document ?? 'autre', phase: data.phase ?? null, file_path: filePath, original_file_name: file.name, mime_type: file.type, file_size: file.size }, ['projet_id', 'nom', 'type_document', 'phase', 'file_path', 'original_file_name', 'mime_type', 'file_size'])
    return response(config, { document }, 201)
  }
  const downloadMatch = path.match(/^\/documents\/(\d+)\/download$/)
  if (downloadMatch) { const doc = await first<Row>('SELECT * FROM documents WHERE id=?', [Number(downloadMatch[1])]); if (!doc?.file_path) return response(config, { message: 'Fichier introuvable.' }, 404); const bytes = await readLocalDocument(String(doc.file_path)); const content = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; return response(config, new Blob([content], { type: String(doc.mime_type ?? 'application/octet-stream') })) }

  for (const [resource, definition] of Object.entries(resourceMap)) {
    if (path === `/${resource}` && method === 'get') {
      const projectId = url.searchParams.get('projet_id')
      const rows = await select<Row>(`SELECT r.*, p.nom projet_nom FROM ${definition.table} r LEFT JOIN projets p ON p.id=r.projet_id ${projectId ? 'WHERE r.projet_id=?' : ''} ORDER BY r.id DESC`, projectId ? [Number(projectId)] : [])
      const enriched = await Promise.all(rows.map(async (row) => ({
        ...row,
        projet: row.projet_id ? { id: row.projet_id, nom: row.projet_nom } : undefined,
        partenaire: row.partenaire_id ? await first<Row>('SELECT * FROM partenaires WHERE id=?', [Number(row.partenaire_id)]) : undefined,
        document: row.document_id ? await first<Row>('SELECT * FROM documents WHERE id=?', [Number(row.document_id)]) : undefined,
      })))
      return response(config, pagination(enriched))
    }
    if (path === `/${resource}` && method === 'post') return response(config, await createRecord(definition.table, data, definition.fields), 201)
    const match = path.match(new RegExp(`^/${resource}/(\\d+)$`))
    if (match) { const id = Number(match[1]); if (method === 'patch') return response(config, await updateRecord(definition.table, id, data, definition.fields)); if (method === 'delete') { await execute(`DELETE FROM ${definition.table} WHERE id=?`, [id]); return response(config, { message: 'Élément supprimé.' }) } }
  }

  if (path === '/suivi-chantier' && method === 'get') {
    const items = await projects(new URL('http://local/projets'))
    const assistant = await select<Row>('SELECT * FROM assistant_items ORDER BY created_at DESC')
    const workload = await select<Row>('SELECT * FROM workload_blocks ORDER BY starts_at')
    const time = await first<Row>('SELECT COALESCE(SUM(minutes),0) total FROM time_entries')
    return response(config, { projects: items, counts: { total: items.length, by_phase: Object.fromEntries(CHANTIER_PHASES.map((phase) => [phase.value, items.filter((item) => item.phase === phase.value).length])) }, widgets: { urgent_documents: [], upcoming_documents: [], inactive_projects: [], assistant_items: assistant, time_minutes: Number(time?.total ?? 0), workload }, generated_at: now() })
  }

  return response(config, { message: `Fonction locale à migrer : ${method.toUpperCase()} ${path}` }, 501)
}

export const localApiAdapter: AxiosAdapter = (config) => localRoute(config)
