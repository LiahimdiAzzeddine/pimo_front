import { ArrowRight, BadgeCheck, FileCheck2, FolderKanban, ReceiptText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: FolderKanban,
    title: 'Projets',
    text: 'Suivi des phases, clients, intervenants et informations essentielles.',
  },
  {
    icon: FileCheck2,
    title: 'Documents',
    text: 'Depot, validation et consultation des pieces liees aux missions.',
  },
  {
    icon: ReceiptText,
    title: 'Finances',
    text: 'Pilotage des devis, factures, paiements et relances.',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Accueil PIMOO">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-lg font-bold text-white">P</span>
            <span className="text-xl font-bold">PIMOO</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700">
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Plateforme de gestion MOE</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
              Centralisez vos projets, documents et suivis de chantier.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              PIMOO accompagne les missions de maitrise d oeuvre avec un espace unique pour organiser les clients,
              consulter les documents, suivre les finances et garder une vision claire sur chaque projet.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                Se connecter
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#acces" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700">
                Acces securises
                <ShieldCheck className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="rounded-lg bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Tableau de bord</p>
                  <p className="mt-1 text-2xl font-bold">Vue projet</p>
                </div>
                <BadgeCheck className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="mt-6 grid gap-3">
                {['Consultation en cours', 'Documents a valider', 'Factures suivies'].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                    <span className="text-sm text-slate-200">{item}</span>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-950">{index + 2}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="acces" className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Acces reserve aux utilisateurs autorises</h2>
            <p className="mt-1 text-sm text-slate-500">
              Les portails de depot, validation et signature restent accessibles uniquement par lien securise.
            </p>
          </div>
          <Link to="/login" className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Ouvrir l'espace MOE
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
