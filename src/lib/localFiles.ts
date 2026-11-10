import { BaseDirectory, mkdir, readDir, readFile, remove, writeFile } from '@tauri-apps/plugin-fs'
import { basename, dirname, join } from '@tauri-apps/api/path'
import { execute, first, select } from './localDb'

const isAbsolutePath = (path: string) => /^(?:[a-zA-Z]:[\\/]|\/|file:)/.test(path)
const reservedWindowsNames = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

type ProjectRow = { id: number; nom?: unknown }
type StoredDocumentRow = { id: number; projet_id: number; nom?: string | null; original_file_name?: string | null; file_path?: string | null }

const fileExtension = (name: string): string => {
  const match = name.match(/\.([a-zA-Z0-9]{1,10})$/)
  return match ? `.${match[1].toLowerCase()}` : ''
}

export function sanitizeDocumentFileName(name: string, originalFileName: string, documentId?: number): string {
  const extension = fileExtension(originalFileName) || fileExtension(name)
  const withoutExtension = extension && name.toLocaleLowerCase().endsWith(extension) ? name.slice(0, -extension.length) : name
  const cleaned = withoutExtension
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 120)
    .replace(/[. ]+$/g, '')
  const fallback = cleaned || `Document${documentId ? ` ${documentId}` : ''}`
  const base = reservedWindowsNames.test(fallback) ? `${fallback} - document` : fallback
  return `${base}${extension}`
}

const uniqueFileName = (preferred: string, occupied: Set<string>): string => {
  const extension = fileExtension(preferred)
  const base = extension ? preferred.slice(0, -extension.length) : preferred
  let candidate = preferred
  let suffix = 2
  while (occupied.has(candidate.toLocaleLowerCase())) {
    candidate = `${base} (${suffix})${extension}`
    suffix += 1
  }
  occupied.add(candidate.toLocaleLowerCase())
  return candidate
}

export function sanitizeProjectDirectoryName(name: string, projectId: number): string {
  const cleaned = name
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 100)
    .replace(/[. ]+$/g, '')
  const fallback = cleaned || `Projet ${projectId}`
  return reservedWindowsNames.test(fallback) ? `${fallback} - projet` : fallback
}

export async function projectDocumentDirectoryName(projectId: number): Promise<string> {
  const projects = await select<ProjectRow>('SELECT id, nom FROM projets ORDER BY id')
  const current = projects.find((project) => Number(project.id) === projectId)
  const baseName = sanitizeProjectDirectoryName(String(current?.nom ?? ''), projectId)
  const occurrence = projects
    .filter((project) => Number(project.id) <= projectId)
    .filter((project) => sanitizeProjectDirectoryName(String(project.nom ?? ''), Number(project.id)).toLocaleLowerCase('fr') === baseName.toLocaleLowerCase('fr'))
    .length
  return occurrence > 1 ? `${baseName} (${occurrence})` : baseName
}

async function configuredDocumentsPath(): Promise<string | undefined> {
  const profile = await first<{ documents_path?: unknown }>('SELECT documents_path FROM app_profile WHERE id=1')
  const path = String(profile?.documents_path ?? '').trim()
  return path || undefined
}

export async function storeLocalDocument(projectId: number, file: File, preferredName = file.name, excludeDocumentId = 0): Promise<string> {
  const configured = await configuredDocumentsPath()
  const projectDirectory = await projectDocumentDirectoryName(projectId)
  const existing = await select<StoredDocumentRow>('SELECT id, file_path FROM documents WHERE projet_id=? AND file_path IS NOT NULL', [projectId])
  const occupied = new Set<string>()
  for (const document of existing) {
    if (Number(document.id) === excludeDocumentId || !document.file_path) continue
    occupied.add((await basename(document.file_path)).toLocaleLowerCase())
  }
  const filename = uniqueFileName(sanitizeDocumentFileName(preferredName, file.name, excludeDocumentId || undefined), occupied)
  if (configured) {
    const directory = await join(configured, projectDirectory)
    const path = await join(directory, filename)
    await mkdir(directory, { recursive: true })
    await writeFile(path, new Uint8Array(await file.arrayBuffer()))
    return path
  }
  const directory = `documents/${projectDirectory}`
  const path = `${directory}/${filename}`
  await mkdir(directory, { baseDir: BaseDirectory.AppData, recursive: true })
  await writeFile(path, new Uint8Array(await file.arrayBuffer()), { baseDir: BaseDirectory.AppData })
  return path
}

export async function migrateProjectDocuments(projectId: number): Promise<number> {
  const documents = await select<StoredDocumentRow>('SELECT id, projet_id, nom, original_file_name, file_path FROM documents WHERE projet_id=? AND file_path IS NOT NULL ORDER BY id', [projectId])
  if (!documents.length) return 0
  const configured = await configuredDocumentsPath()
  const folderName = await projectDocumentDirectoryName(projectId)
  const targetDirectory = configured ? await join(configured, folderName) : `documents/${folderName}`
  await mkdir(targetDirectory, configured ? { recursive: true } : { baseDir: BaseDirectory.AppData, recursive: true })
  const oldDirectories = new Set<string>()
  const assignedNames = new Set<string>()
  let moved = 0

  for (const document of documents) {
    if (!document.file_path) continue
    const currentFilename = await basename(document.file_path)
    const originalName = String(document.original_file_name || currentFilename)
    const preferredName = String(document.nom || originalName)
    const filename = uniqueFileName(sanitizeDocumentFileName(preferredName, originalName, document.id), assignedNames)
    const target = configured ? await join(targetDirectory, filename) : `${targetDirectory}/${filename}`
    if (document.file_path.replaceAll('\\', '/').toLocaleLowerCase() === target.replaceAll('\\', '/').toLocaleLowerCase()) continue
    const previousDirectory = await dirname(document.file_path)
    const bytes = await readLocalDocument(document.file_path)
    await writeFile(target, bytes, configured ? undefined : { baseDir: BaseDirectory.AppData })
    await execute('UPDATE documents SET file_path=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [target, document.id])
    await removeLocalDocument(document.file_path)
    oldDirectories.add(previousDirectory)
    moved += 1
  }

  for (const directory of oldDirectories) {
    if (directory.replaceAll('\\', '/').toLocaleLowerCase() === targetDirectory.replaceAll('\\', '/').toLocaleLowerCase()) continue
    const options = isAbsolutePath(directory) ? undefined : { baseDir: BaseDirectory.AppData }
    const remaining = await readDir(directory, options).catch(() => undefined)
    if (remaining?.length === 0) await remove(directory, options).catch(() => undefined)
  }
  return moved
}

export async function migrateAllProjectDocuments(): Promise<number> {
  const projects = await select<ProjectRow>('SELECT id, nom FROM projets ORDER BY id')
  let moved = 0
  for (const project of projects) moved += await migrateProjectDocuments(Number(project.id))
  return moved
}

let directoryMigration: Promise<number> | undefined

export async function ensureNamedProjectDirectories(): Promise<number> {
  directoryMigration ??= migrateAllProjectDocuments().catch((error) => {
    directoryMigration = undefined
    throw error
  })
  return directoryMigration
}

export async function readLocalDocument(path: string): Promise<Uint8Array> {
  return isAbsolutePath(path) ? readFile(path) : readFile(path, { baseDir: BaseDirectory.AppData })
}

export async function removeLocalDocument(path?: string | null): Promise<void> {
  if (!path) return
  await (isAbsolutePath(path) ? remove(path) : remove(path, { baseDir: BaseDirectory.AppData })).catch(() => undefined)
}
