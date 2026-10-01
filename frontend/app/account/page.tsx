import AccountDashboard from "@/components/layout/account-dashboard";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "overview" } = await searchParams;
  return <><SiteHeader /><AccountDashboard initialTab={tab} /><SiteFooter /></>;
}