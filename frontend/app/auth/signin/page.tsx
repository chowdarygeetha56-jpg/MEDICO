import AuthForm from "@/components/auth/auth-form";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const safeCallback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/account";
  return <><SiteHeader /><main className="auth-page"><AuthForm mode="signIn" callbackUrl={safeCallback} /></main><SiteFooter /></>;
}