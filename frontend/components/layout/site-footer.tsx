import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <Link className="site-footer__brand" href="/">MEDICO</Link>
        <span>Thoughtful access to everyday healthcare.</span>
        <span>© {new Date().getFullYear()} MEDICO</span>
      </div>
    </footer>
  );
}