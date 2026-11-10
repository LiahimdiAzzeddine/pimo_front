import { BaseDirectory, copyFile, mkdir, readDir, writeTextFile } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import { join } from '@tauri-apps/api/path'
import { execute, first } from './localDb'

async function copyDocuments(source: string, destination: string, local = false): Promise<void> {
  const entries = await readDir(source, local ? { baseDir: BaseDirectory.AppData } : undefined).catch(() => [])
  for (const entry of entries) {
    const relative = local ? `${source}/${entry.name}` : await join(source, entry.name)
    const target = await join(destination, entry.name)
    if (entry.isDirectory) {
      await mkdir(target, { recursive: true })
      await copyDocuments(relative, target, local)
    } else if (entry.isFile) {
      await copyFile(relative, target, local ? { fromPathBaseDir: BaseDirectory.AppData } : undefined)
    }
  }
}

export async function exportLocalBackup(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, recursive: true, title: 'Choisir le dossier de sauvegarde Pimoo' })
  if (!selected || Array.isArray(selected)) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destination = await join(selected, `Pimoo-backup-${stamp}`)
  const profile = await first<{ documents_path?: unknown }>('SELECT documents_path FROM app_profile WHERE id=1')
  const documentsPath = String(profile?.documents_path ?? '').trim()
  const normalizedDocuments = documentsPath.replaceAll('\\', '/').replace(/\/$/, '').toLocaleLowerCase()
  const normalizedDestination = destination.replaceAll('\\', '/').toLocaleLowerCase()
  if (normalizedDocuments && normalizedDestination.startsWith(`${normalizedDocuments}/`)) throw new Error('Choisissez un dossier de sauvegarde situé en dehors du dossier des documents Pimoo.')
  await mkdir(destination, { recursive: true })
  await execute('PRAGMA wal_checkpoint(FULL)')
  await copyFile('pimoo.db', await join(destination, 'pimoo.db'), { fromPathBaseDir: BaseDirectory.AppConfig })
  const documentDestination = await join(destination, 'documents')
  await mkdir(documentDestination, { recursive: true })
  await copyDocuments(documentsPath || 'documents', documentDestination, !documentsPath)
  await writeTextFile(await join(destination, 'backup.json'), JSON.stringify({ application: 'Pimoo', version: 1, created_at: new Date().toISOString() }, null, 2))
  return destination
}
