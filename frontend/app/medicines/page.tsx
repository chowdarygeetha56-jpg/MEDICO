import MedicineBrowser from "@/components/medicines/medicine-browser";

export default async function MedicinesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return <MedicineBrowser initialSearch={q} />;
}