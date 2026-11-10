import { useEffect, useState } from 'react'
import { Building2, Download, ImageUp, KeyRound, LogOut, MailCheck, Save, UserRound } from 'lucide-react'
import api, { isLocalApp } from '@/lib/api'
import { exportLocalBackup } from '@/lib/localBackup'
import { apiErrorMessage } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import PageHeader from '@/components/ui/PageHeader'
import type { User } from '@/types'

type ProfileForm = {
  name: string
  email: string
  phone: string
  company_name: string
  siret: string
  address: string
  legal_mentions: string
  email_signature: string
  preferences: {
    language: 'fr' | 'en'
    timezone: string
    email_notifications: boolean
    reminder_notifications: boolean
  }
}

const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500'
const textareaClass = `${inputClass} min-h-28 resize-y`

function profileFromUser(user: User | null): ProfileForm {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    company_name: user?.company_name ?? '',
    siret: user?.siret ?? '',
    address: user?.address ?? '',
    legal_mentions: user?.legal_mentions ?? '',
    email_signature: user?.email_signature ?? '',
    preferences: {
      language: user?.preferences?.language ?? 'fr',
      timezone: user?.preferences?.timezone ?? 'Europe/Paris',
      email_notifications: user?.preferences?.email_notifications ?? true,
      reminder_notifications: user?.preferences?.reminder_notifications ?? true,
    },
  }
}

export default function Profile() {
  const { user, setCurrentUser, logout } = useAuth()
  const [profile, setProfile] = useState<ProfileForm>(() => profileFromUser(user))
  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verificationMessage, setVerificationMessage] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [avatarMessage, setAvatarMessage] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [backupState, setBackupState] = useState({ busy: false, message: '', error: '' })

  useEffect(() => {
    setProfile(profileFromUser(user))
  }, [user])

  const field = (name: keyof Omit<ProfileForm, 'preferences'>, value: string) => {
    setProfile((current) => ({ ...current, [name]: value }))
  }

  const preference = (name: keyof ProfileForm['preferences'], value: string | boolean) => {
    setProfile((current) => ({ ...current, preferences: { ...current.preferences, [name]: value } }))
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setProfileMessage('')
    setProfileError('')
    setSavingProfile(true)
    try {
      const { data } = await api.patch<{ message: string; user: User }>('/auth/profile', profile)
      setCurrentUser(data.user)
      setProfileMessage(data.message)
    } catch (error) {
      setProfileError(apiErrorMessage(error, 'Impossible de mettre à jour le profil. Vérifiez les informations saisies.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')
    setSavingPassword(true)
    try {
      const { data } = await api.put<{ message: string }>('/auth/password', passwords)
      setPasswords({ current_password: '', password: '', password_confirmation: '' })
      setPasswordMessage(data.message)
    } catch (error) {
      setPasswordError(apiErrorMessage(error, 'Impossible de modifier le mot de passe. Vérifiez le mot de passe actuel et la confirmation.'))
    } finally {
      setSavingPassword(false)
    }
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarMessage('')
    setAvatarError('')
    setSavingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const { data } = await api.post<{ message: string; user: User }>('/auth/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setCurrentUser(data.user)
      setAvatarMessage(data.message)
    } catch (error) {
      setAvatarError(apiErrorMessage(error, 'Impossible d’envoyer le logo. Utilisez une image JPG, PNG ou WebP de 2 Mo maximum.'))
    } finally {
      setSavingAvatar(false)
      event.target.value = ''
    }
  }

  const logoutAll = async () => {
    await api.post('/auth/logout-all')
    logout()
  }

  const resendVerification = async () => {
    setVerificationMessage('')
    setVerificationError('')
    try {
      const { data } = await api.post<{ message: string }>('/auth/email/verification-notification')
      setVerificationMessage(data.message)
    } catch (error) {
      setVerificationError(apiErrorMessage(error, 'Impossible d’envoyer le lien de vérification pour le moment.'))
    }
  }

  const backup = async () => {
    setBackupState({ busy: true, message: '', error: '' })
    try {
      const destination = await exportLocalBackup()
      setBackupState({ busy: false, message: destination ? `Sauvegarde créée dans ${destination}` : '', error: '' })
    } catch (error) {
      setBackupState({ busy: false, message: '', error: apiErrorMessage(error, 'Impossible de créer la sauvegarde locale.') })
    }
  }

  return <><PageHeader title="Profil & sécurité" description="Gérez votre identité, vos informations professionnelles et vos préférences." />
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <form onSubmit={saveProfile} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50"><UserRound className="h-5 w-5 text-blue-600" /></div><div><h2 className="font-bold">Informations personnelles</h2><p className="text-xs text-slate-400">Compte {user?.status}</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-medium">Nom complet</span><input required value={profile.name} onChange={(event) => field('name', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Email</span><input type="email" required value={profile.email} onChange={(event) => field('email', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Téléphone</span><input type="tel" value={profile.phone} onChange={(event) => field('phone', event.target.value)} className={inputClass} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"><Building2 className="h-5 w-5 text-emerald-600" /></div><div><h2 className="font-bold">Profil professionnel MOE</h2><p className="text-xs text-slate-400">Coordonnées utilisées pour identifier votre activité.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-medium">Société / agence</span><input value={profile.company_name} onChange={(event) => field('company_name', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">SIRET / SIREN</span><input value={profile.siret} onChange={(event) => field('siret', event.target.value)} className={inputClass} /></label>
            <label className="block md:col-span-2"><span className="mb-1 block text-sm font-medium">Adresse professionnelle</span><input value={profile.address} onChange={(event) => field('address', event.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Mentions légales</span><textarea value={profile.legal_mentions} onChange={(event) => field('legal_mentions', event.target.value)} className={textareaClass} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Signature email</span><textarea value={profile.email_signature} onChange={(event) => field('email_signature', event.target.value)} className={textareaClass} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold">Préférences</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-medium">Langue</span><select value={profile.preferences.language} onChange={(event) => preference('language', event.target.value)} className={inputClass}><option value="fr">Français</option><option value="en">Anglais</option></select></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Fuseau horaire</span><select value={profile.preferences.timezone} onChange={(event) => preference('timezone', event.target.value)} className={inputClass}><option value="Europe/Paris">Europe/Paris</option><option value="Africa/Casablanca">Africa/Casablanca</option><option value="UTC">UTC</option></select></label>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" checked={profile.preferences.email_notifications} onChange={(event) => preference('email_notifications', event.target.checked)} className="h-4 w-4" />Notifications email</label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm"><input type="checkbox" checked={profile.preferences.reminder_notifications} onChange={(event) => preference('reminder_notifications', event.target.checked)} className="h-4 w-4" />Notifications de relance</label>
          </div>
        </section>

        {(profileMessage || profileError) && <p className={`text-sm ${profileError ? 'text-red-600' : 'text-emerald-600'}`}>{profileError || profileMessage}</p>}
        <button disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}</button>
      </form>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50"><ImageUp className="h-5 w-5 text-cyan-600" /></div><div><h2 className="font-bold">Logo / avatar</h2><p className="text-xs text-slate-400">JPG, PNG ou WebP, 2 Mo max.</p></div></div>
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
            {user?.avatar_url ? <img src={user.avatar_url} alt="Logo du profil" className="h-28 w-28 rounded-xl object-cover" /> : <div className="grid h-28 w-28 place-items-center rounded-xl bg-white text-3xl font-bold text-slate-300">{profile.name.slice(0, 1).toUpperCase() || 'M'}</div>}
          </div>
          <label className="mt-4 flex cursor-pointer justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="sr-only" />{savingAvatar ? 'Envoi...' : 'Changer le logo'}</label>
          {(avatarMessage || avatarError) && <p className={`mt-3 text-sm ${avatarError ? 'text-red-600' : 'text-emerald-600'}`}>{avatarError || avatarMessage}</p>}
        </section>

        {isLocalApp && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white"><Download className="h-5 w-5 text-blue-600" /></div><div><h2 className="font-bold text-blue-950">Données locales</h2><p className="text-xs text-blue-700">Base SQLite et documents stockés uniquement sur cet appareil.</p></div></div>
          <button type="button" disabled={backupState.busy} onClick={() => void backup()} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{backupState.busy ? 'Sauvegarde...' : 'Créer une sauvegarde complète'}</button>
          {(backupState.message || backupState.error) && <p className={`mt-3 break-words text-xs ${backupState.error ? 'text-red-700' : 'text-emerald-700'}`}>{backupState.error || backupState.message}</p>}
        </section>}

        {!isLocalApp && <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50"><KeyRound className="h-5 w-5 text-violet-600" /></div><div><h2 className="font-bold">Mot de passe</h2><p className="text-xs text-slate-400">Dernière connexion : {user?.last_login_at ? new Date(user.last_login_at).toLocaleString('fr-FR') : 'non disponible'}</p></div></div>
          <form onSubmit={savePassword} className="space-y-4">{[['current_password', 'Mot de passe actuel'], ['password', 'Nouveau mot de passe'], ['password_confirmation', 'Confirmation']].map(([name, label]) => <label key={name} className="block"><span className="mb-1 block text-sm font-medium">{label}</span><input type="password" required value={passwords[name as keyof typeof passwords]} onChange={(event) => setPasswords({ ...passwords, [name]: event.target.value })} className={inputClass} /></label>)}{(passwordMessage || passwordError) && <p className={`text-sm ${passwordError ? 'text-red-600' : 'text-emerald-600'}`}>{passwordError || passwordMessage}</p>}<button disabled={savingPassword} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingPassword ? 'Modification...' : 'Modifier le mot de passe'}</button></form>
        </section>}
      </aside>
    </div>

    {!user?.email_verified_at && <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6"><div><h2 className="font-bold text-amber-900">Email non vérifié</h2><p className="text-sm text-amber-700">Validez votre adresse pour sécuriser pleinement votre compte.</p>{(verificationMessage || verificationError) && <p className={`mt-2 text-sm font-medium ${verificationError ? 'text-red-700' : 'text-emerald-700'}`}>{verificationError || verificationMessage}</p>}</div><button onClick={resendVerification} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><MailCheck className="h-4 w-4" />Renvoyer le lien</button></section>}
    {!isLocalApp && <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 p-6"><div><h2 className="font-bold text-red-900">Sessions actives</h2><p className="text-sm text-red-700">Déconnectez tous les navigateurs et appareils utilisant votre compte.</p></div><button onClick={logoutAll} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"><LogOut className="h-4 w-4" />Tout déconnecter</button></section>}
  </>
}
