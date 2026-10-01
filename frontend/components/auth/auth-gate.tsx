"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useConvexReady } from "@/components/providers/convex-provider";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const ready = useConvexReady();
  return ready ? <ConnectedAuthGate>{children}</ConnectedAuthGate> : (
    <div className="protected-state"><ShieldCheck size={25} /><strong>Account connection required</strong><p>Configure the MEDICO Convex deployment to access this page securely.</p><Link className="button button--outline" href="/">Back to home</Link></div>
  );
}

function ConnectedAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
  }, [isAuthenticated, isLoading, pathname, router]);
  if (isLoading) return <div className="protected-state"><LoaderCircle className="spin" /><span>Checking your account...</span></div>;
  if (!isAuthenticated) return <div className="protected-state"><span>Redirecting to sign in...</span></div>;
  return children;
}