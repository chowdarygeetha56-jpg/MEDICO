import AuthForm from "@/components/auth/auth-form";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default function SignUpPage() {
  return <><SiteHeader /><main className="auth-page"><AuthForm mode="signUp" callbackUrl="/account" /></main><SiteFooter /></>;
}