import { OrderDetailView } from "@/components/orders/orders-view";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><SiteHeader /><OrderDetailView id={id} /><SiteFooter /></>;
}