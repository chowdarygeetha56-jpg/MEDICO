"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Activity, Bell, CreditCard, MapPin, PackageCheck, Pill, UserRound } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import AuthGate from "@/components/auth/auth-gate";
import { useConvexReady } from "@/components/providers/convex-provider";
import { formatRupees } from "@/lib/format";

const tabs = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "prescriptions", label: "Prescriptions", icon: Pill },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AccountDashboard({ initialTab = "overview" }: { initialTab?: string }) {
  const ready = useConvexReady();
  return ready ? <AuthGate><ConnectedAccountDashboard initialTab={initialTab as TabId} /></AuthGate> : (
    <main className="account-page"><div className="preview-setup"><strong>Your account is not connected</strong><span>Connect Convex Auth and the MEDICO deployment to view private account data.</span></div></main>
  );
}

function ConnectedAccountDashboard({ initialTab }: { initialTab: TabId }) {
  const user = useQuery(api.users.current, {});
  const orders = useQuery(api.orders.mine, {});
  const addresses = useQuery(api.addresses.mine, {});
  const prescriptions = useQuery(api.prescriptions.mine, {});
  const payments = useQuery(api.payments.mine, {});
  const notifications = useQuery(api.notifications.mine, {});
  const markRead = useMutation(api.notifications.markRead);
  const activeOrders = orders?.filter((order) => ["placed", "processing", "packed", "out_for_delivery"].includes(order.status)) ?? [];
  const pendingPrescriptions = prescriptions?.filter((item) => ["pending", "under_review"].includes(item.status)) ?? [];

  return (
    <main className="account-page">
      <header className="account-welcome"><p className="eyebrow"><span className="eyebrow__dot" /> Your MEDICO account</p><h1>{initialTab === "overview" ? `Good to see you, ${user?.name?.split(" ")[0] ?? "there"}.` : tabs.find((tab) => tab.id === initialTab)?.label}</h1><p>Manage your account, orders, and delivery details in one place.</p></header>
      <div className="account-layout">
        <nav className="account-sidebar" aria-label="Account sections">{tabs.map((tab) => { const Icon = tab.icon; return <Link className={initialTab === tab.id ? "is-active" : ""} href={`/account?tab=${tab.id}`} key={tab.id}><Icon size={17} />{tab.label}</Link>; })}<Link href="/admin">Admin dashboard</Link></nav>
        <section className="account-content">
          {initialTab === "overview" && <>
            <div className="account-stat-grid"><article><span>Total orders</span><strong>{orders?.length ?? "-"}</strong></article><article><span>Active orders</span><strong>{activeOrders.length}</strong></article><article><span>Prescriptions in review</span><strong>{pendingPrescriptions.length}</strong></article><article><span>Saved addresses</span><strong>{addresses?.length ?? "-"}</strong></article></div>
            <div className="section-heading"><h2>Recent orders</h2><Link className="section-link" href="/orders">View all</Link></div>
            {!orders?.length ? <div className="empty-panel"><strong>No orders yet.</strong><Link className="button button--outline" href="/medicines">Browse medicines</Link></div> : <div className="order-list">{orders.slice(0, 3).map((order) => <Link className="account-order-row" href={`/orders/${order._id}`} key={order._id}><span><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small></span><span>{order.status.replaceAll("_", " ")}</span><strong>{formatRupees(order.totalPaise)}</strong></Link>)}</div>}
            <div className="account-quick-links"><Link href="/prescription"><Pill size={19} /><span><strong>Prescriptions</strong><small>{pendingPrescriptions.length ? `${pendingPrescriptions.length} awaiting review` : "View submissions and status"}</small></span></Link><Link href="/checkout"><MapPin size={19} /><span><strong>Delivery addresses</strong><small>{addresses?.length ? `${addresses.length} saved` : "Add an address at checkout"}</small></span></Link></div>
          </>}
          {initialTab === "profile" && <div className="account-panel"><h2>Profile</h2><dl className="profile-list"><div><dt>Name</dt><dd>{user?.name ?? "-"}</dd></div><div><dt>Email</dt><dd>{user?.email ?? "Not provided"}</dd></div><div><dt>Mobile</dt><dd>{user?.phone ?? "Not provided"}</dd></div><div><dt>Account type</dt><dd>{user?.role === "admin" ? "Administrator" : "Customer"}</dd></div></dl><p className="inline-note">Profile editing will be enabled after verified contact-change flows are configured.</p></div>}
          {initialTab === "orders" && <div className="account-panel"><h2>My orders</h2>{orders?.map((order) => <Link className="account-order-row" href={`/orders/${order._id}`} key={order._id}><span><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small></span><span>{order.status.replaceAll("_", " ")}</span><strong>{formatRupees(order.totalPaise)}</strong></Link>)}</div>}
          {initialTab === "prescriptions" && <div className="account-panel"><div className="section-heading"><h2>My prescriptions</h2><Link className="button button--outline" href="/prescription">Open prescription center</Link></div>{prescriptions?.length ? prescriptions.map((item) => <div className="simple-data-row" key={item._id}><span>{item.fileName}</span><span className={`status-pill status-pill--${item.status}`}>{item.status.replaceAll("_", " ")}</span></div>) : <div className="empty-panel">No prescription submissions yet.</div>}</div>}
          {initialTab === "addresses" && <div className="account-panel"><div className="section-heading"><h2>Saved addresses</h2><Link className="button button--outline" href="/checkout">Manage at checkout</Link></div>{addresses?.length ? addresses.map((address) => <div className="simple-data-row" key={address._id}><span><strong>{address.fullName}</strong><small>{address.line1}, {address.city}, {address.state} {address.pincode} · {address.mobile}</small></span>{address.isDefault && <span className="status-pill status-pill--paid">Default</span>}</div>) : <div className="empty-panel">No addresses saved. Add one during checkout.</div>}</div>}
          {initialTab === "payments" && <div className="account-panel"><h2>Payment history</h2>{payments?.length ? payments.map((payment) => <div className="simple-data-row" key={payment._id}><span><strong>{formatRupees(payment.amountPaise)}</strong><small>{payment.gatewayPaymentId ?? "Awaiting gateway payment"}</small></span><span className={`status-pill status-pill--${payment.status}`}>{payment.status}</span></div>) : <div className="empty-panel">No payments recorded yet.</div>}</div>}
          {initialTab === "notifications" && <div className="account-panel"><h2>Notifications</h2>{notifications?.length ? notifications.map((notification) => <article className={notification.readAt ? "notification-row" : "notification-row notification-row--unread"} key={notification._id}><span><strong>{notification.title}</strong><small>{notification.message}</small><small>{new Date(notification.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></span>{!notification.readAt && <button className="text-button" type="button" onClick={() => void markRead({ id: notification._id as Id<"notifications"> })}>Mark read</button>}</article>) : <div className="empty-panel">You are all caught up.</div>}</div>}
        </section>
      </div>
    </main>
  );
}