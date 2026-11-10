import Database from '@tauri-apps/plugin-sql'

type SqlValue = string | number | null | Uint8Array

let databasePromise: Promise<Database> | undefined

export function localDatabase() {
  databasePromise ??= Database.load('sqlite:pimoo.db')
  return databasePromise
}

export async function select<T extends Record<string, unknown>>(sql: string, values: SqlValue[] = []): Promise<T[]> {
  return (await localDatabase()).select<T[]>(sql, values)
}

export async function first<T extends Record<string, unknown>>(sql: string, values: SqlValue[] = []): Promise<T | undefined> {
  return (await select<T>(sql, values))[0]
}

export async function execute(sql: string, values: SqlValue[] = []) {
  return (await localDatabase()).execute(sql, values.map((value) => typeof value === 'boolean' ? Number(value) : value))
}

export async function insert(sql: string, values: SqlValue[] = []): Promise<number> {
  const result = await execute(sql, values)
  return Number(result.lastInsertId)
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

export const now = () => new Date().toISOString()
