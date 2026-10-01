import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow"><span className="eyebrow__dot" /> Your health, made simpler</p>
          <h1 id="hero-title">Everyday care, delivered with care.</h1>
          <p className="hero__description">
            Find the medicines and wellness essentials you need, with a pharmacy
            experience designed to feel clear, considered, and convenient.
          </p>
          <form className="search-form" action="/medicines" method="get" role="search">
            <span className="search-form__icon" aria-hidden="true">⌕</span>
            <label className="sr-only" htmlFor="medicine-search">Search medicines or wellness needs</label>
            <input
              id="medicine-search"
              name="q"
              type="search"
              placeholder="Search medicines or wellness needs"
            />
            <button className="button button--primary" type="submit">Search</button>
          </form>
          <div className="hero__actions">
            <Link className="button button--outline" href="/medicines">Browse medicines</Link>
            <Link className="text-link" href="/prescription">Prescription support <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="hero__media">
          <div className="hero__image-wrap">
            <Image
              className="hero__image"
              src="/images/pharmacy-care.jpg"
              alt="A healthcare professional offering attentive care"
              fill
              priority
              sizes="(max-width: 700px) 100vw, 45vw"
            />
          </div>
          <div className="hero__note">
            <span className="hero__note-label">Care comes first</span>
            <strong>A more thoughtful way to manage your health essentials.</strong>
          </div>
        </div>
      </section>
      <div className="trust-row" aria-label="MEDICO priorities">
        <div className="trust-row__item"><span className="trust-row__check" aria-hidden="true">+</span> Clear, considered choices</div>
        <div className="trust-row__item"><span className="trust-row__check" aria-hidden="true">+</span> Support at every step</div>
        <div className="trust-row__item"><span className="trust-row__check" aria-hidden="true">+</span> Your wellbeing, always</div>
      </div>
    </>
  );
}