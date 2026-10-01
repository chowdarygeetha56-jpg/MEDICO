"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Bell, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { useConvexReady } from "@/components/providers/convex-provider";
import { NAVIGATION_LINKS, SITE_NAME } from "@/lib/constants";

function GuestActions() {
  return (
    <div className="site-header__actions">
      <Link className="text-link" href="/auth/signin">Sign in</Link>
      <Link className="button button--primary" href="/auth/signup">Create account</Link>
    </div>
  );
}

function ConnectedActions() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const cart = useQuery(api.cart.mine, isAuthenticated ? {} : "skip");
  const notifications = useQuery(api.notifications.mine, isAuthenticated ? {} : "skip");
  const cartCount = cart?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const unreadCount = notifications?.filter((item) => !item.readAt).length ?? 0;

  if (isLoading) return <div className="header-skeleton" aria-label="Loading account" />;
  if (!isAuthenticated) return <GuestActions />;

  return (
    <div className="site-header__actions site-header__actions--signed-in">
      <Link className="header-icon-link" href="/medicines" aria-label="Search medicines"><Search size={19} /></Link>
      <Link className="header-icon-link header-icon-link--badge" href="/cart" aria-label={`Cart, ${cartCount} items`}>
        <ShoppingBag size={19} />{cartCount > 0 && <span className="icon-badge">{cartCount > 99 ? "99+" : cartCount}</span>}
      </Link>
      <Link className="header-icon-link header-icon-link--badge" href="/account?tab=notifications" aria-label={`Notifications, ${unreadCount} unread`}>
        <Bell size={19} />{unreadCount > 0 && <span className="icon-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </Link>
      <details className="account-menu">
        <summary aria-label="Open account menu"><span className="account-menu__avatar"><UserRound size={16} /></span><span className="account-menu__name">{user?.name?.split(" ")[0] ?? "Account"}</span><ChevronDown size={14} /></summary>
        <div className="account-menu__panel">
          <Link href="/account">Dashboard</Link>
          <Link href="/orders">My orders</Link>
          <Link href="/prescription">My prescriptions</Link>
          <Link href="/account?tab=addresses">Saved addresses</Link>
          {user?.role === "admin" && <Link href="/admin">Admin dashboard</Link>}
          <button type="button" onClick={() => void signOut().then(() => router.push("/"))}>Sign out</button>
        </div>
      </details>
    </div>
  );
}

function MobileAccountAction() {
  const { isAuthenticated } = useConvexAuth();
  return <Link className="header-icon-link" href={isAuthenticated ? "/account" : "/auth/signin"} aria-label={isAuthenticated ? "Account" : "Sign in"}><UserRound size={19} /></Link>;
}

export default function SiteHeader() {
  const pathname = usePathname();
  const convexReady = useConvexReady();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label={`${SITE_NAME} home`} onClick={() => setMobileOpen(false)}>
          <span className="brand__mark" aria-hidden="true">+</span><span>{SITE_NAME}</span>
        </Link>
        <nav className={`site-nav${mobileOpen ? " site-nav--open" : ""}`} aria-label="Main navigation">
          <Link className={pathname === "/" ? "is-active" : ""} href="/" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link className={pathname.startsWith("/medicines") ? "is-active" : ""} href="/medicines" onClick={() => setMobileOpen(false)}>Search</Link>
          {NAVIGATION_LINKS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link className={active ? "is-active" : ""} key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>;
          })}
          <Link className={pathname === "/offers" ? "is-active" : ""} href="/offers" onClick={() => setMobileOpen(false)}>Offers</Link>
        </nav>
        <div className="site-header__desktop-actions">{convexReady ? <ConnectedActions /> : <GuestActions />}</div>
        <div className="site-header__mobile-actions">
          <Link className="header-icon-link" href="/cart" aria-label="Cart"><ShoppingBag size={19} /></Link>
          {convexReady ? <MobileAccountAction /> : <Link className="header-icon-link" href="/auth/signin" aria-label="Sign in"><UserRound size={19} /></Link>}
          <button className="header-icon-link menu-toggle" type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
    </header>
  );
}