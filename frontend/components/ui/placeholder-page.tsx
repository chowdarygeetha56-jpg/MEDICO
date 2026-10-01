import Link from "next/link";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="placeholder-page">
        <div className="placeholder-page__inner">
          <p className="eyebrow"><span className="eyebrow__dot" /> MEDICO</p>
          <h1>{title}</h1>
          <p className="placeholder-page__description">{description}</p>
          <Link className="button button--primary" href="/">Back to home</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}