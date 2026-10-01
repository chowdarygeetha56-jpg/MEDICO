import MedicineDetails from "@/components/medicines/medicine-details";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

export default async function MedicineDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><SiteHeader /><MedicineDetails id={id} /><SiteFooter /></>;
}