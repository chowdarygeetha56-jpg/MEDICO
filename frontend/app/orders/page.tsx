import { OrdersView } from "@/components/orders/orders-view";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default function OrdersPage() {
  return <><SiteHeader /><OrdersView /><SiteFooter /></>;
}