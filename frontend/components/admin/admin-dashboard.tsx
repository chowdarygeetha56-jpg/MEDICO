"use client";

import { useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { BadgePercent, Boxes, ClipboardList, CreditCard, FileCheck2, Package, Plus, ShieldCheck, Users } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import AuthGate from "@/components/auth/auth-gate";
import { useConvexReady } from "@/components/providers/convex-provider";
import { formatRupees } from "@/lib/format";

const sections = ["Overview", "Products", "Categories", "Orders", "Prescriptions", "Users", "Inventory", "Coupons", "Payments", "Refunds"] as const;
type Section = (typeof sections)[number];

type ProductForm = { name: string; genericName: string; brand: string; manufacturer: string; categoryId: string; description: string; usageInfo: string; storageInfo: string; safetyInfo: string; strength: string; packSize: string; price: string; discountPercent: string; image: string; prescriptionRequired: boolean };
const blankProduct: ProductForm = { name: "", genericName: "", brand: "", manufacturer: "", categoryId: "", description: "", usageInfo: "", storageInfo: "", safetyInfo: "", strength: "", packSize: "", price: "", discountPercent: "0", image: "/images/pharmacy-care.jpg", prescriptionRequired: false };

export default function AdminDashboard() {
  const ready = useConvexReady();
  return ready ? <AuthGate><ConnectedAdminDashboard /></AuthGate> : <main className="admin-page"><div className="preview-setup"><strong>Admin services are not connected</strong><span>Configure Convex Auth, link a deployment, and bootstrap an administrator before managing the store.</span></div></main>;
}

function ConnectedAdminDashboard() {
  const user = useQuery(api.users.current, {});
  const [section, setSection] = useState<Section>("Overview");
  if (user === undefined) return <main className="admin-page"><p>Checking administrator access...</p></main>;
  if (!user || user.role !== "admin") return <main className="admin-page"><div className="empty-panel"><ShieldCheck size={25} /><strong>Administrator access required.</strong><p>Your signed-in account does not have the administrator role.</p></div></main>;
  return <AdminWorkspace section={section} onSection={setSection} />;
}

function AdminWorkspace({ section, onSection }: { section: Section; onSection: (section: Section) => void }) {
  const overview = useQuery(api.admin.overview, {});
  const products = useQuery(api.medicines.adminList, {});
  const categories = useQuery(api.categories.adminList, {});
  const orders = useQuery(api.orders.adminList, {});
  const prescriptions = useQuery(api.prescriptions.adminList, {});
  const users = useQuery(api.admin.listUsers, {});
  const lowStock = useQuery(api.inventory.lowStock, {});
  const coupons = useQuery(api.coupons.adminList, {});
  const payments = useQuery(api.payments.adminList, {});
  const refunds = useQuery(api.refunds.adminList, {});
  const setUserRole = useMutation(api.admin.setUserRole);
  const updateOrder = useMutation(api.orders.adminSetStatus);
  const reviewPrescription = useMutation(api.prescriptions.review);
  const setStock = useMutation(api.inventory.setStock);
  const setMedicineActive = useMutation(api.medicines.adminSetActive);
  const setCategoryActive = useMutation(api.categories.adminSetActive);
  const createMedicine = useMutation(api.medicines.adminCreate);
  const updateMedicine = useMutation(api.medicines.adminUpdate);
  const createCategory = useMutation(api.categories.adminCreate);
  const createCoupon = useMutation(api.coupons.create);
  const setCouponActive = useMutation(api.coupons.setActive);
  const reviewRefund = useMutation(api.refunds.review);
  const processRefund = useAction(api.paymentActions.processRazorpayRefund);
  const [productForm, setProductForm] = useState<ProductForm>(blankProduct);
  const [editingProductId, setEditingProductId] = useState<Id<"medicines"> | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = {
      name: productForm.name.trim(), genericName: productForm.genericName.trim(), brand: productForm.brand.trim(), manufacturer: productForm.manufacturer.trim(), categoryId: productForm.categoryId as Id<"categories">,
      description: productForm.description.trim(), usageInfo: productForm.usageInfo.trim(), storageInfo: productForm.storageInfo.trim(), safetyInfo: productForm.safetyInfo.trim(), strength: productForm.strength.trim(), packSize: productForm.packSize.trim(), pricePaise: Math.round(Number(productForm.price) * 100), discountPercent: Number(productForm.discountPercent), image: productForm.image.trim(), prescriptionRequired: productForm.prescriptionRequired,
    };
    setPending(true); setMessage("");
    try {
      if (editingProductId) await updateMedicine({ id: editingProductId, ...values });
      else await createMedicine(values);
      setProductForm(blankProduct); setEditingProductId(null); setMessage("Product saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save product."); }
    finally { setPending(false); }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage("");
    try {
      await createCategory({ name: String(form.get("name")), slug: String(form.get("slug")), description: String(form.get("description")), icon: "Pill", sortOrder: categories?.length ?? 0 });
      event.currentTarget.reset(); setMessage("Category created.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create category."); }
    finally { setPending(false); }
  }

  async function saveCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage("");
    try {
      const discountType = String(form.get("discountType")) as "percent" | "fixed";
      const discountInput = Number(form.get("discountValue"));
      await createCoupon({ code: String(form.get("code")), discountType, discountValue: discountType === "fixed" ? Math.round(discountInput * 100) : discountInput, minimumOrderPaise: Math.round(Number(form.get("minimumOrder")) * 100), validFrom: Date.now(), validUntil: new Date(String(form.get("validUntil"))).getTime(), usageLimit: Number(form.get("usageLimit")) || undefined });
      event.currentTarget.reset(); setMessage("Coupon created.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create coupon."); }
    finally { setPending(false); }
  }

  async function processApprovedRefund(id: Id<"refunds">) {
    setPending(true); setMessage("");
    try {
      await reviewRefund({ id, decision: "approved" });
      await processRefund({ refundId: id });
      setMessage("Refund submitted to Razorpay.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Refund processing did not complete."); }
    finally { setPending(false); }
  }

  return (
    <main className="admin-page">
      <header className="admin-heading"><div><p className="eyebrow"><span className="eyebrow__dot" /> MEDICO operations</p><h1>Store administration</h1><p>Manage live catalog and operational records. Changes are written to Convex.</p></div><span className="admin-badge"><ShieldCheck size={15} /> Administrator</span></header>
      <nav className="admin-tabs" aria-label="Administration sections">{sections.map((item) => <button className={section === item ? "is-active" : ""} key={item} type="button" onClick={() => { onSection(item); setMessage(""); }}>{item}</button>)}</nav>
      {message && <p className="form-message" role="status">{message}</p>}
      {section === "Overview" && <section className="admin-content"><div className="admin-stats">{[
        ["Customers", overview?.users ?? "-", Users], ["Active products", overview?.activeMedicines ?? "-", Package], ["Orders", overview?.orders ?? "-", ClipboardList], ["Paid revenue", overview ? formatRupees(overview.paidRevenuePaise) : "-", CreditCard], ["Pending prescriptions", overview?.pendingPrescriptions ?? "-", FileCheck2], ["Low-stock items", overview?.lowStock ?? "-", Boxes],
      ].map(([label, value, Icon]) => { const Symbol = Icon as typeof Users; return <article className="admin-stat" key={String(label)}><Symbol size={18} /><span>{String(label)}</span><strong>{String(value)}</strong></article>; })}</div><p className="inline-note">Payment and revenue totals reflect only server-verified captured payments.</p></section>}

      {section === "Products" && <section className="admin-content"><div className="section-heading"><h2>Products</h2><span>{products?.length ?? 0} listed</span></div><form className="admin-form" onSubmit={(event) => void saveProduct(event)}><h3>{editingProductId ? "Edit medicine" : "Add medicine"}</h3><div className="form-grid"><label>Name<input required value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label><label>Generic name<input required value={productForm.genericName} onChange={(event) => setProductForm({ ...productForm, genericName: event.target.value })} /></label><label>Brand<input required value={productForm.brand} onChange={(event) => setProductForm({ ...productForm, brand: event.target.value })} /></label><label>Manufacturer<input required value={productForm.manufacturer} onChange={(event) => setProductForm({ ...productForm, manufacturer: event.target.value })} /></label><label>Category<select required value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Choose category</option>{categories?.filter((item) => item.active).map((item) => <option value={item._id} key={item._id}>{item.name}</option>)}</select></label><label>Price (₹)<input required type="number" min="0.01" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label><label>Discount (%)<input type="number" min="0" max="90" value={productForm.discountPercent} onChange={(event) => setProductForm({ ...productForm, discountPercent: event.target.value })} /></label><label>Strength<input required value={productForm.strength} onChange={(event) => setProductForm({ ...productForm, strength: event.target.value })} /></label><label>Pack size<input required value={productForm.packSize} onChange={(event) => setProductForm({ ...productForm, packSize: event.target.value })} /></label><label>Image path or URL<input required value={productForm.image} onChange={(event) => setProductForm({ ...productForm, image: event.target.value })} /></label><label className="form-grid__wide">Description<textarea required value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label><label className="form-grid__wide">Usage information<textarea required value={productForm.usageInfo} onChange={(event) => setProductForm({ ...productForm, usageInfo: event.target.value })} /></label><label className="form-grid__wide">Storage information<textarea required value={productForm.storageInfo} onChange={(event) => setProductForm({ ...productForm, storageInfo: event.target.value })} /></label><label className="form-grid__wide">Safety information<textarea required value={productForm.safetyInfo} onChange={(event) => setProductForm({ ...productForm, safetyInfo: event.target.value })} /></label><label className="filter-check"><input type="checkbox" checked={productForm.prescriptionRequired} onChange={(event) => setProductForm({ ...productForm, prescriptionRequired: event.target.checked })} /> Prescription required</label></div><div className="form-actions"><button className="button button--primary" disabled={pending} type="submit">{pending ? "Saving..." : editingProductId ? "Save changes" : "Create product"}</button>{editingProductId && <button className="button button--outline" type="button" onClick={() => { setEditingProductId(null); setProductForm(blankProduct); }}>Cancel edit</button>}</div></form><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Brand</th><th>Price</th><th>Stock</th><th>Rx</th><th>Status</th><th>Actions</th></tr></thead><tbody>{products?.map((product) => <tr key={product._id}><td><strong>{product.name}</strong><small>{product.strength} · {product.packSize}</small></td><td>{product.brand}</td><td>{formatRupees(product.pricePaise)}</td><td>{product.stock}</td><td>{product.prescriptionRequired ? "Required" : "No"}</td><td>{product.active ? "Active" : "Inactive"}</td><td><button className="text-button" type="button" onClick={() => { setEditingProductId(product._id); setProductForm({ name: product.name, genericName: product.genericName, brand: product.brand, manufacturer: product.manufacturer, categoryId: product.categoryId, description: product.description, usageInfo: product.usageInfo, storageInfo: product.storageInfo, safetyInfo: product.safetyInfo, strength: product.strength, packSize: product.packSize, price: (product.pricePaise / 100).toFixed(2), discountPercent: String(product.discountPercent), image: product.image, prescriptionRequired: product.prescriptionRequired }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button className="text-button" type="button" onClick={() => void setMedicineActive({ id: product._id, active: !product.active }).catch((error) => setMessage(error.message))}>{product.active ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table></div></section>}

      {section === "Categories" && <section className="admin-content"><div className="section-heading"><h2>Categories</h2></div><form className="admin-form admin-form--compact" onSubmit={(event) => void saveCategory(event)}><h3>Add category</h3><div className="form-grid"><label>Name<input name="name" required /></label><label>URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><label className="form-grid__wide">Description<input name="description" required /></label></div><button className="button button--primary" type="submit" disabled={pending}><Plus size={15} /> Create category</button></form>{categories?.map((category) => <div className="simple-data-row" key={category._id}><span><strong>{category.name}</strong><small>/{category.slug} · {category.description}</small></span><button className="text-button" type="button" onClick={() => void setCategoryActive({ id: category._id, active: !category.active }).catch((error) => setMessage(error.message))}>{category.active ? "Disable" : "Enable"}</button></div>)}</section>}

      {section === "Orders" && <section className="admin-content"><h2>Order management</h2>{orders?.map((order) => <div className="simple-data-row" key={order._id}><span><strong>{order.orderNumber}</strong><small>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")} · {formatRupees(order.totalPaise)} · {order.paymentStatus}</small></span><select aria-label={`Update ${order.orderNumber} status`} value={order.status} onChange={(event) => void updateOrder({ id: order._id, status: event.target.value as "processing" | "packed" | "out_for_delivery" | "delivered" | "cancelled" }).catch((error) => setMessage(error.message))}><option value={order.status}>{order.status.replaceAll("_", " ")}</option>{["processing", "packed", "out_for_delivery", "delivered", "cancelled"].filter((status) => status !== order.status).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>)}</section>}

      {section === "Prescriptions" && <section className="admin-content"><h2>Prescription review</h2>{prescriptions?.length ? prescriptions.map((item) => <div className="simple-data-row" key={item._id}><span><strong>{item.fileName}</strong><small>{(item.sizeBytes / 1024 / 1024).toFixed(1)} MB · <a href={item.url ?? "#"} target="_blank" rel="noreferrer">Open securely</a></small><input aria-label="Review note" placeholder="Optional note to customer" value={reviewNotes[item._id] ?? ""} onChange={(event) => setReviewNotes({ ...reviewNotes, [item._id]: event.target.value })} /></span><button className="button button--outline" type="button" onClick={() => void reviewPrescription({ id: item._id, decision: "rejected", note: reviewNotes[item._id] ?? "Please contact support." }).catch((error) => setMessage(error.message))}>Reject</button><button className="button button--primary" type="button" onClick={() => void reviewPrescription({ id: item._id, decision: "approved", note: reviewNotes[item._id] ?? "Reviewed by MEDICO." }).catch((error) => setMessage(error.message))}>Approve</button></div>) : <div className="empty-panel">No prescriptions awaiting review.</div>}</section>}

      {section === "Users" && <section className="admin-content"><h2>Customers</h2>{users?.map((customer) => <div className="simple-data-row" key={customer.id}><span><strong>{customer.name}</strong><small>{customer.email ?? "No email"} · {customer.phone ?? "No mobile"} · Joined {new Date(customer.joinedAt).toLocaleDateString("en-IN")}</small></span><select aria-label={`Role for ${customer.name}`} value={customer.role} onChange={(event) => void setUserRole({ id: customer.id as Id<"users">, role: event.target.value as "customer" | "admin" }).catch((error) => setMessage(error.message))}><option value="customer">Customer</option><option value="admin">Administrator</option></select></div>)}</section>}

      {section === "Inventory" && <section className="admin-content"><div className="section-heading"><h2>Low stock</h2><span>{lowStock?.length ?? 0} items</span></div>{lowStock?.length ? lowStock.map((row) => { const medicine = products?.find((product) => product._id === row.medicineId); return <div className="simple-data-row" key={row._id}><span><strong>{medicine?.name ?? "Medicine"}</strong><small>{row.stock} in stock · alert at {row.lowStockThreshold}</small></span><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void setStock({ medicineId: row.medicineId, stock: Number(data.get("stock")), lowStockThreshold: Number(data.get("threshold")) }).then(() => setMessage("Inventory updated.")).catch((error) => setMessage(error.message)); }}><input name="stock" type="number" min="0" defaultValue={row.stock} aria-label="New stock quantity" /><input name="threshold" type="number" min="0" defaultValue={row.lowStockThreshold} aria-label="Low-stock threshold" /><button className="button button--outline" type="submit">Update</button></form></div>; }) : <div className="empty-panel">No low-stock products.</div>}</section>}

      {section === "Coupons" && <section className="admin-content"><form className="admin-form admin-form--compact" onSubmit={(event) => void saveCoupon(event)}><h3>Create coupon</h3><div className="form-grid"><label>Code<input name="code" required minLength={3} maxLength={24} /></label><label>Discount type<select name="discountType"><option value="percent">Percent</option><option value="fixed">Fixed amount (₹)</option></select></label><label>Discount value<input name="discountValue" type="number" required min="0.01" step="0.01" /></label><label>Minimum order (₹)<input name="minimumOrder" type="number" required min="0" step="0.01" /></label><label>Valid until<input name="validUntil" type="date" required min={new Date().toISOString().slice(0, 10)} /></label><label>Usage limit<input name="usageLimit" type="number" min="1" /></label></div><button className="button button--primary" type="submit" disabled={pending}><BadgePercent size={16} /> Create coupon</button></form>{coupons?.map((coupon) => <div className="simple-data-row" key={coupon._id}><span><strong>{coupon.code}</strong><small>{coupon.discountType === "percent" ? `${coupon.discountValue}%` : formatRupees(coupon.discountValue)} · used {coupon.usageCount} times · expires {new Date(coupon.validUntil).toLocaleDateString("en-IN")}</small></span><button className="text-button" type="button" onClick={() => void setCouponActive({ id: coupon._id, active: !coupon.active }).catch((error) => setMessage(error.message))}>{coupon.active ? "Disable" : "Enable"}</button></div>)}</section>}

      {section === "Payments" && <section className="admin-content"><h2>Payments</h2>{payments?.map((payment) => <div className="simple-data-row" key={payment._id}><span><strong>{formatRupees(payment.amountPaise)}</strong><small>{payment.gatewayPaymentId ?? payment.gatewayOrderId ?? "No Razorpay reference"}</small></span><span className={`status-pill status-pill--${payment.status}`}>{payment.status}</span></div>)}</section>}

      {section === "Refunds" && <section className="admin-content"><h2>Refund requests</h2>{refunds?.length ? refunds.map((refund) => <div className="simple-data-row" key={refund._id}><span><strong>{formatRupees(refund.amountPaise)} · {refund.status}</strong><small>{refund.reason}</small></span>{refund.status === "requested" && <><button className="text-button" type="button" onClick={() => void reviewRefund({ id: refund._id, decision: "rejected" }).catch((error) => setMessage(error.message))}>Reject</button><button className="button button--primary" type="button" disabled={pending} onClick={() => void processApprovedRefund(refund._id)}>Approve and process</button></>}{refund.status === "approved" && <button className="button button--primary" type="button" disabled={pending} onClick={() => void processRefund({ refundId: refund._id }).then(() => setMessage("Refund submitted to Razorpay.")).catch((error) => setMessage(error.message))}>Retry Razorpay refund</button>}</div>) : <div className="empty-panel">No refund requests.</div>}</section>}
    </main>
  );
}