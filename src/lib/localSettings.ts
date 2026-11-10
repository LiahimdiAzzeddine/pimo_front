import { open } from '@tauri-apps/plugin-dialog'
import { mkdir, remove, writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { basename, join } from '@tauri-apps/api/path'
import { execute, select } from './localDb'
import { projectDocumentDirectoryName, readLocalDocument, removeLocalDocument } from './localFiles'

type DocumentRow = { id: number; projet_id: number; file_path?: string | null }

export async function chooseDocumentsDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, recursive: true, title: 'Choisir le nouveau dossier de stockage Pimoo' })
  if (!selected || Array.isArray(selected)) return null
  const path = await join(selected, 'Pimoo Documents')
  await mkdir(path, { recursive: true })
  const testPath = await join(path, '.pimoo-write-test')
  await writeTextFile(testPath, 'Pimoo')
  await remove(testPath)
  return path
}

export async function relocateLocalDocuments(destination: string): Promise<number> {
  const documents = await select<DocumentRow>('SELECT id, projet_id, file_path FROM documents WHERE file_path IS NOT NULL')
  const copied: Array<{ id: number; path: string }> = []

  for (const document of documents) {
    if (!document.file_path) continue
    const projectDirectory = await join(destination, await projectDocumentDirectoryName(document.projet_id))
    await mkdir(projectDirectory, { recursive: true })
    const filename = await basename(document.file_path)
    const target = await join(projectDirectory, filename)
    const bytes = await readLocalDocument(document.file_path)
    await writeFile(target, bytes)
    copied.push({ id: document.id, path: target })
  }

  for (const document of copied) await execute('UPDATE documents SET file_path=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [document.path, document.id])
  await execute('UPDATE app_profile SET documents_path=?, updated_at=CURRENT_TIMESTAMP WHERE id=1', [destination])
  return copied.length
}

export async function resetLocalBusinessData(): Promise<void> {
  const documents = await select<DocumentRow>('SELECT id, projet_id, file_path FROM documents WHERE file_path IS NOT NULL')
  await Promise.all(documents.map((document) => removeLocalDocument(document.file_path)))

  const tables = [
    'project_activities', 'time_entries', 'workload_blocks', 'assistant_items', 'project_warranties',
    'project_reservations', 'project_amendments', 'site_reports', 'permit_instructions', 'project_steps',
    'devis', 'factures', 'relances', 'lots', 'documents', 'project_members', 'project_client_contacts',
    'projets', 'partenaires', 'clients',
  ]
  for (const table of tables) await execute(`DELETE FROM ${table}`)
}
