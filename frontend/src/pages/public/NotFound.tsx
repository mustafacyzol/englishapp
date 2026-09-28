import { LinkButton } from '@/components/ui/Button'
import { higoImg } from '@/components/game/Higo'

/** A lost page, with Higo pointing the way home. */
export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70dvh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <p className="font-display text-[7rem] font-black leading-none tracking-tight text-flame/15">404</p>
      <img src={higoImg('point')} alt="Higo" className="-mt-16 size-40 object-contain" />
      <h1 className="mt-2 font-display text-3xl font-black">Bu sayfa kaybolmuş.</h1>
      <p className="mt-2 text-ink-soft">Aradığın sayfa taşınmış ya da hiç olmamış olabilir. Higo sana yolu göstersin.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton to="/">Ana sayfa</LinkButton>
        <LinkButton to="/learn" variant="secondary">Derslerime dön</LinkButton>
      </div>
    </section>
  )
}
