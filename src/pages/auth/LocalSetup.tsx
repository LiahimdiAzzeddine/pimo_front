import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, FolderOpen, HardDrive, ShieldCheck, UserRound } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { mkdir, remove, writeTextFile } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import api from '@/lib/api'
import { apiErrorMessage } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types'

type SetupForm = {
  name: string
  email: string
  phone: string
  company_name: string
  siret: string
  address: string
  documents_path: string
}

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
const setupSteps = [
  { title: 'Votre identité', description: 'Coordonnées du responsable', icon: UserRound },
  { title: 'Votre agence', description: 'Informations professionnelles', icon: Building2 },
  { title: 'Stockage local', description: 'Emplacement des documents', icon: HardDrive },
]

export default function LocalSetup() {
  const { user, setCurrentUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<SetupForm>({
    name: user?.name === 'Mon agence' ? '' : user?.name ?? '',
    email: user?.email === 'local@pimoo.app' ? '' : user?.email ?? '',
    phone: user?.phone ?? '', company_name: user?.company_name ?? '', siret: user?.siret ?? '',
    address: user?.address ?? '', documents_path: user?.documents_path ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [choosingFolder, setChoosingFolder] = useState(false)
  const [step, setStep] = useState(0)

  const field = (name: keyof SetupForm, value: string) => setForm((current) => ({ ...current, [name]: value }))

  const chooseFolder = async () => {
    setChoosingFolder(true); setError('')
    try {
      const selected = await open({ directory: true, multiple: false, recursive: true, title: 'Choisir le dossier de stockage Pimoo' })
      if (!selected || Array.isArray(selected)) return
      const documentsPath = await join(selected, 'Pimoo Documents')
      await mkdir(documentsPath, { recursive: true })
      const testPath = await join(documentsPath, '.pimoo-write-test')
      await writeTextFile(testPath, 'Pimoo')
      await remove(testPath)
      field('documents_path', documentsPath)
    } catch (reason) {
      setError(apiErrorMessage(reason, 'Ce dossier n’est pas accessible en écriture. Choisissez un autre emplacement.'))
    } finally {
      setChoosingFolder(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    if (!form.documents_path) { setError('Choisissez le dossier dans lequel Pimoo enregistrera les documents.'); return }
    setBusy(true)
    try {
      const { data } = await api.post<{ message: string; user: User }>('/local/setup', form)
      setCurrentUser(data.user)
      navigate('/dashboard', { replace: true })
    } catch (reason) {
      setError(apiErrorMessage(reason, 'Impossible de terminer le paramétrage.'))
    } finally {
      setBusy(false)
    }
  }

  const nextStep = () => {
    setError('')
    if (step === 0 && (!form.name.trim() || !form.email.trim())) {
      setError('Renseignez votre nom et votre adresse e-mail professionnelle.')
      return
    }
    setStep((current) => Math.min(current + 1, setupSteps.length - 1))
  }

  const ActiveIcon = setupSteps[step].icon

  return <main className="h-screen w-screen overflow-hidden bg-slate-100 text-slate-900">
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white shadow-sm">P</div><div><p className="text-base font-bold leading-tight">Pimoo</p><p className="text-[11px] text-slate-500">Configuration initiale</p></div></div>
      <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4" />Données locales</div>
    </header>

    <div className="flex h-[calc(100vh-4rem)] min-h-0">
      <aside className="hidden w-80 shrink-0 flex-col bg-slate-900 px-7 py-9 text-white lg:flex">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Premier démarrage</p><h1 className="mt-3 text-2xl font-bold leading-tight">Préparons votre espace de travail</h1><p className="mt-3 text-sm leading-6 text-slate-400">Trois étapes rapides avant d’accéder à votre tableau de bord.</p></div>
        <nav className="mt-10 space-y-2" aria-label="Étapes de configuration">
          {setupSteps.map((item, index) => { const Icon = item.icon; const completed = index < step; const active = index === step; return <button key={item.title} type="button" disabled={index > step} onClick={() => index < step && setStep(index)} className={`flex w-full items-center gap-4 rounded-xl p-3 text-left transition ${active ? 'bg-white/10' : index < step ? 'hover:bg-white/5' : 'cursor-default opacity-45'}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${completed ? 'border-emerald-400 bg-emerald-500 text-white' : active ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-600 text-slate-500'}`}>{completed ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span>
            <span><span className={`block text-sm font-semibold ${active || completed ? 'text-white' : 'text-slate-400'}`}>{item.title}</span><span className="mt-0.5 block text-xs text-slate-500">{item.description}</span></span>
          </button> })}
        </nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-400"><strong className="block text-slate-200">100 % local</strong>Pimoo n’envoie aucune donnée vers un serveur pendant cette configuration.</div>
      </aside>

      <form onSubmit={(event) => { if (step < setupSteps.length - 1) { event.preventDefault(); nextStep() } else void submit(event) }} className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-6 py-3 lg:hidden"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Étape {step + 1} sur {setupSteps.length}</span><span>{setupSteps[step].title}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / setupSteps.length) * 100}%` }} /></div></div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-10 lg:px-14 lg:py-10">
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-7 flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><ActiveIcon className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Étape {step + 1} sur {setupSteps.length}</p><h2 className="mt-1 text-2xl font-bold">{setupSteps[step].title}</h2><p className="mt-1 text-sm text-slate-500">{step === 0 ? 'Identifiez la personne qui utilisera cette installation de Pimoo.' : step === 1 ? 'Ces informations apparaîtront dans vos documents professionnels.' : 'Définissez où seront enregistrés les fichiers de vos projets.'}</p></div></div>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              {step === 0 && <div className="grid gap-6 md:grid-cols-2">
                <label><span className="mb-2 block text-sm font-medium">Nom complet <span className="text-red-500">*</span></span><input autoFocus required value={form.name} onChange={(event) => field('name', event.target.value)} placeholder="Ex. Jean Dupont" className={inputClass} /></label>
                <label><span className="mb-2 block text-sm font-medium">Email professionnel <span className="text-red-500">*</span></span><input type="email" required value={form.email} onChange={(event) => field('email', event.target.value)} placeholder="nom@agence.fr" className={inputClass} /></label>
                <label><span className="mb-2 block text-sm font-medium">Téléphone</span><input type="tel" value={form.phone} onChange={(event) => field('phone', event.target.value)} placeholder="+33 6 00 00 00 00" className={inputClass} /></label>
              </div>}

              {step === 1 && <div className="grid gap-6 md:grid-cols-2">
                <label><span className="mb-2 block text-sm font-medium">Société / agence</span><input autoFocus value={form.company_name} onChange={(event) => field('company_name', event.target.value)} placeholder="Nom de votre agence" className={inputClass} /></label>
                <label><span className="mb-2 block text-sm font-medium">SIRET / SIREN</span><input value={form.siret} onChange={(event) => field('siret', event.target.value)} placeholder="Numéro d’immatriculation" className={inputClass} /></label>
                <label className="md:col-span-2"><span className="mb-2 block text-sm font-medium">Adresse professionnelle</span><input value={form.address} onChange={(event) => field('address', event.target.value)} placeholder="Adresse complète" className={inputClass} /></label>
                <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Vous pourrez modifier ces informations plus tard depuis la page <strong>Profil</strong>.</div>
              </div>}

              {step === 2 && <div className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5"><div className="flex items-start gap-3"><HardDrive className="mt-0.5 h-5 w-5 text-slate-500" /><div><h3 className="text-sm font-semibold">Emplacement des fichiers</h3><p className="mt-1 text-sm leading-6 text-slate-500">Choisissez un dossier sur le disque principal, un disque externe ou un emplacement synchronisé. Pimoo y créera automatiquement le dossier « Pimoo Documents ».</p></div></div></div>
                <button type="button" onClick={() => void chooseFolder()} disabled={choosingFolder} className={`flex w-full items-center gap-4 rounded-xl border-2 p-5 text-left transition disabled:opacity-50 ${form.documents_path ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400' : 'border-dashed border-blue-300 bg-blue-50 hover:border-blue-500'}`}>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${form.documents_path ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>{form.documents_path ? <CheckCircle2 className="h-6 w-6" /> : <FolderOpen className="h-6 w-6" />}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900">{choosingFolder ? 'Ouverture du sélecteur...' : form.documents_path ? 'Dossier sélectionné' : 'Choisir un dossier'}</span><span className="mt-1 block truncate text-xs text-slate-600">{form.documents_path || 'Cliquez pour parcourir les dossiers de votre ordinateur'}</span></span>
                  <span className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Parcourir</span>
                </button>
              </div>}
            </section>

            {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_12px_rgba(15,23,42,0.04)] md:px-10 lg:px-14">
          <button type="button" onClick={() => { setError(''); setStep((current) => Math.max(0, current - 1)) }} disabled={step === 0 || busy} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:invisible"><ArrowLeft className="h-4 w-4" />Précédent</button>
          {step < setupSteps.length - 1 ? <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Continuer<ArrowRight className="h-4 w-4" /></button> : <button disabled={busy || choosingFolder || !form.documents_path} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Configuration...' : 'Terminer et ouvrir Pimoo'}<Check className="h-4 w-4" /></button>}
        </footer>
      </form>
    </div>
  </main>
}
