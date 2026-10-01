export function formatRupees(amountPaise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amountPaise / 100);
}

export function discountedPrice(pricePaise: number, discountPercent: number) {
  return Math.round((pricePaise * (100 - discountPercent)) / 100);
}

export function medicineSellingPricePaise(medicine: { pricePaise?: number; discountPercent?: number; priceSource?: string }) {
  if (medicine.pricePaise === undefined) return undefined;
  return medicine.priceSource === "MEDICO_DEMO"
    ? medicine.pricePaise
    : discountedPrice(medicine.pricePaise, medicine.discountPercent ?? 0);
}

export function medicineMrpPaise(medicine: { pricePaise?: number; mrpPaise?: number; priceSource?: string }) {
  if (medicine.mrpPaise !== undefined) return medicine.mrpPaise;
  return medicine.priceSource === "MEDICO_DEMO" ? undefined : medicine.pricePaise;
}