import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '@/lib/api'
import type { PaginatedResponse } from '@/types'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'

export interface ResourceRecord { id: number; [key: string]: unknown }
export interface FieldConfig { name: string; label: string; type?: 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'select' | 'textarea' | 'checkbox'; required?: boolean; readOnly?: boolean; options?: { value: string; label: string }[]; compute?: (values: Record<string, string>) => string }
export interface ColumnConfig<T> { label: string; render: (record: T) => React.ReactNode }

function recordValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10)
  return String(value)
}

export default function ResourcePage<T extends ResourceRecord>({ endpoint, queryKey, title, description, createLabel, fields, columns, editable, editLabel = 'Modifier' }: {
  endpoint: string; queryKey: string; title: string; description: string; createLabel: string; fields: FieldConfig[]; columns: ColumnConfig<T>[]; editable?: (record: T) => boolean; editLabel?: string
}) {
  const client = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [search, setSearch] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const query = useQuery({ queryKey: [queryKey], queryFn: async () => (await api.get<PaginatedResponse<T>>(endpoint)).data.data })
  const formValues = Object.fromEntries(fields.map((field) => [field.name, field.compute ? field.compute(values) : (values[field.name] ?? '')]))
  const create = useMutation({
    mutationFn: async () => api.post(endpoint, Object.fromEntries(Object.entries(formValues).map(([key, value]) => [key, value === '' ? null : value === 'true' ? true : value === 'false' ? false : value]))),
    onSuccess: () => { client.invalidateQueries({ queryKey: [queryKey] }); setOpen(false); setSearchParams({}, { replace: true }); setValues({}); setError('') },
    onError: () => setError('Impossible d enregistrer. Verifiez les champs.'),
  })
  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return null
      return api.patch(`${endpoint}/${editing.id}`, Object.fromEntries(Object.entries(formValues).map(([key, value]) => [key, value === '' ? null : value === 'true' ? true : value === 'false' ? false : value])))
    },
    onSuccess: () => { client.invalidateQueries({ queryKey: [queryKey] }); setEditing(null); setValues({}); setError('') },
    onError: () => setError('Impossible de modifier. Verifiez les champs.'),
  })
  const rows = (query.data ?? []).filter((record) => JSON.stringify(record).toLowerCase().includes(search.toLowerCase()))
  const closeModal = () => { setOpen(false); setEditing(null); setSearchParams({}, { replace: true }); setValues({}); setError('') }
  const openEdit = (record: T) => {
    setValues(Object.fromEntries(fields.map((field) => [field.name, recordValue(record[field.name])])))
    setEditing(record)
    setError('')
  }
  const modalOpen = open || Boolean(editing) || searchParams.get('create') === '1'
  const modalTitle = editing ? editLabel : createLabel
  const pending = create.isPending || update.isPending

  return <>
    <PageHeader title={title} description={description} action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />{createLabel}</button>} />
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center border-b border-slate-100 p-4"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher..." className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400" /></div><span className="ml-auto text-xs text-slate-400">{rows.length} resultat(s)</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr>{columns.map((column) => <th key={column.label} className="px-5 py-3 font-semibold">{column.label}</th>)}{editable && <th className="px-5 py-3 font-semibold">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{query.isLoading ? <tr><td colSpan={columns.length + (editable ? 1 : 0)} className="p-10 text-center text-sm text-slate-400">Chargement...</td></tr> : rows.length === 0 ? <tr><td colSpan={columns.length + (editable ? 1 : 0)} className="p-10 text-center text-sm text-slate-400">Aucune donnee</td></tr> : rows.map((record) => <tr key={record.id} className="hover:bg-slate-50/60">{columns.map((column) => <td key={column.label} className="px-5 py-4 text-sm text-slate-600">{column.render(record)}</td>)}{editable && <td className="px-5 py-4 text-sm text-slate-600">{editable(record) && <button type="button" title={editLabel} onClick={() => openEdit(record)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>}</td>}</tr>)}</tbody></table></div>
    </section>

    <Modal open={modalOpen} title={modalTitle} onClose={closeModal}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); editing ? update.mutate() : create.mutate() }}>
      {fields.map((field) => {
        const value = field.compute ? field.compute(values) : (values[field.name] ?? '')
        if (field.type === 'checkbox') {
          return <label key={field.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={value === 'true'} onChange={(event) => setValues({ ...values, [field.name]: event.target.checked ? 'true' : 'false' })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{field.label}</label>
        }

        return <label key={field.name} className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</span>{field.type === 'select' ? <select required={field.required} disabled={field.readOnly || Boolean(field.compute)} value={value} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500"><option value="">Selectionner</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea required={field.required} readOnly={field.readOnly || Boolean(field.compute)} value={value} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm read-only:bg-slate-50 read-only:text-slate-500" /> : <input required={field.required} readOnly={field.readOnly || Boolean(field.compute)} type={field.type ?? 'text'} value={value} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm read-only:bg-slate-50 read-only:text-slate-500" />}</label>
      })}
      {error && <p className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={closeModal} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={pending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Enregistrement...' : 'Enregistrer'}</button></div>
    </form></Modal>
  </>
}
