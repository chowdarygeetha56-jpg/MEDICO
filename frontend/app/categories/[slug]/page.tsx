import MedicineBrowser from "@/components/medicines/medicine-browser";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MedicineBrowser initialCategory={slug} />;
}