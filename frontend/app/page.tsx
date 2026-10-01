import FeatureGrid from "@/components/home/feature-grid";
import HomeSections from "@/components/home/home-sections";
import HeroSection from "@/components/home/hero-section";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <HomeSections />
        <FeatureGrid />
      </main>
      <SiteFooter />
    </>
  );
}
