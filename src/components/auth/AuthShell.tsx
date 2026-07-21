import type { ReactNode } from 'react'

export default function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
    <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold">P</div><span className="text-xl font-bold">PIMOO</span></div>
      <div className="max-w-lg"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">Maitrise d oeuvre</p><h2 className="mt-4 text-4xl font-bold leading-tight">Pilotez chaque projet, du premier document a la livraison.</h2><p className="mt-5 text-slate-400">Documents, intervenants, consultations et finances reunis dans un espace securise.</p></div>
      <p className="text-xs text-slate-500">Plateforme professionnelle MOE</p>
    </section>
    <main className="flex items-center justify-center p-6"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><span className="text-2xl font-bold">PIMOO</span></div><h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p><div className="mt-8">{children}</div></div></main>
  </div>
}
