import { useState } from 'react'
import { AlertTriangle, Archive, CheckCircle2, FolderCog, FolderOpen, HardDrive, RotateCcw, ShieldCheck } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { apiErrorMessage } from '@/lib/utils'
import { exportLocalBackup } from '@/lib/localBackup'
import { chooseDocumentsDirectory, relocateLocalDocuments, resetLocalBusinessData } from '@/lib/localSettings'

export default function Settings() {
  const { user, setCurrentUser } = useAuth()
  const [storage, setStorage] = useState({ busy: false, message: '', error: '' })
  const [backup, setBackup] = useState({ busy: false, message: '', error: '' })
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState('')

  const changeStorage = async () => {
    setStorage({ busy: true, message: '', error: '' })
    try {
      const path = await chooseDocumentsDirectory()
      if (!path) { setStorage({ busy: false, message: '', error: '' }); return }
      if (path === user?.documents_path) { setStorage({ busy: false, message: 'Ce dossier est déjà utilisé.', error: '' }); return }
      const count = await relocateLocalDocuments(path)
      if (user) setCurrentUser({ ...user, documents_path: path })
      setStorage({ busy: false, message: `${count} document(s) copié(s). Le nouveau dossier est maintenant actif.`, error: '' })
    } catch (error) {
      setStorage({ busy: false, message: '', error: apiErrorMessage(error, 'Impossible de modifier le dossier de stockage. Les données existantes n’ont pas été supprimées.') })
    }
  }

  const createBackup = async () => {
    setBackup({ busy: true, message: '', error: '' })
    try {
      const path = await exportLocalBackup()
      setBackup({ busy: false, message: path ? `Sauvegarde créée dans ${path}` : '', error: '' })
    } catch (error) {
      setBackup({ busy: false, message: '', error: apiErrorMessage(error, 'Impossible de créer la sauvegarde.') })
    }
  }

  const resetData = async () => {
    if (confirmation !== 'REINITIALISER') return
    setResetBusy(true); setResetError('')
    try {
      await resetLocalBusinessData()
      setResetOpen(false)
      window.location.hash = '#/dashboard'
      window.location.reload()
    } catch (error) {
      setResetError(apiErrorMessage(error, 'La réinitialisation a échoué. Certaines données peuvent encore être présentes.'))
    } finally {
      setResetBusy(false)
    }
  }

  return <>
    <PageHeader title="Paramètres" description="Configurez le stockage local, les sauvegardes et les données de cette installation." />
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><FolderCog className="h-5 w-5" /></div><div><h2 className="font-bold">Dossier des documents</h2><p className="mt-1 text-sm leading-6 text-slate-500">Les documents existants seront copiés dans le nouveau dossier. L’ancien dossier ne sera pas supprimé automatiquement.</p></div></div>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Emplacement actuel</p><p className="mt-2 break-all text-sm font-medium text-slate-700">{user?.documents_path || 'Dossier interne de Pimoo'}</p></div>
        <button onClick={() => void changeStorage()} disabled={storage.busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><FolderOpen className="h-4 w-4" />{storage.busy ? 'Déplacement des documents...' : 'Choisir un nouveau dossier'}</button>
        {(storage.message || storage.error) && <p className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${storage.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{storage.error ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{storage.error || storage.message}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Archive className="h-5 w-5" /></div><div><h2 className="font-bold">Sauvegarde complète</h2><p className="mt-1 text-sm leading-6 text-slate-500">Copiez la base SQLite et tous les documents dans un dossier de sauvegarde indépendant.</p></div></div>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldCheck className="h-5 w-5 shrink-0" />Créez une sauvegarde avant toute réinitialisation.</div>
        <button onClick={() => void createBackup()} disabled={backup.busy} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><HardDrive className="h-4 w-4" />{backup.busy ? 'Sauvegarde...' : 'Créer une sauvegarde'}</button>
        {(backup.message || backup.error) && <p className={`mt-4 break-words rounded-xl p-3 text-sm ${backup.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{backup.error || backup.message}</p>}
      </section>
    </div>

    <section className="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><RotateCcw className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="font-bold text-red-900">Réinitialiser les données métier</h2><p className="mt-1 text-sm text-slate-500">Supprime définitivement les projets, clients, partenaires, documents, devis et données de chantier. Votre profil et le dossier configuré seront conservés.</p></div><button onClick={() => { setConfirmation(''); setResetError(''); setResetOpen(true) }} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Réinitialiser</button></div>
    </section>

    <Modal open={resetOpen} title="Confirmer la réinitialisation" onClose={() => !resetBusy && setResetOpen(false)}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><strong>Cette action est irréversible.</strong> Les fichiers enregistrés par Pimoo et toutes les données métier locales seront supprimés. Créez d’abord une sauvegarde si nécessaire.</div>
      <label className="mt-5 block"><span className="mb-2 block text-sm font-medium">Saisissez <strong>REINITIALISER</strong> pour confirmer</span><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label>
      {resetError && <p className="mt-3 text-sm text-red-700">{resetError}</p>}
      <div className="mt-6 flex justify-end gap-2"><button disabled={resetBusy} onClick={() => setResetOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button disabled={confirmation !== 'REINITIALISER' || resetBusy} onClick={() => void resetData()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{resetBusy ? 'Suppression...' : 'Supprimer toutes les données'}</button></div>
    </Modal>
  </>
}
