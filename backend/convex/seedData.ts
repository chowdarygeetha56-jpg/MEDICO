export const categorySeed = [
  { name: "Pain Relief", slug: "pain-relief", description: "Everyday pain relief essentials.", icon: "Activity" },
  { name: "Cold & Cough", slug: "cold-cough", description: "Seasonal cold and cough care.", icon: "Wind" },
  { name: "Vitamins & Supplements", slug: "vitamins", description: "Daily vitamins and wellness supplements.", icon: "Leaf" },
  { name: "Digestive Health", slug: "digestive-health", description: "Digestive and hydration essentials.", icon: "Apple" },
  { name: "Skin Care", slug: "skin-care", description: "Everyday skin protection and care.", icon: "Sun" },
  { name: "Personal Care", slug: "personal-care", description: "Personal hygiene and family care.", icon: "Sparkles" },
  { name: "Diabetes Care", slug: "diabetes-care", description: "At-home glucose monitoring supplies.", icon: "Droplets" },
  { name: "First Aid", slug: "first-aid", description: "First aid and home-care essentials.", icon: "BriefcaseMedical" },
  { name: "Baby Care", slug: "baby-care", description: "Gentle essentials for little ones.", icon: "Baby" },
  { name: "Wellness", slug: "wellness", description: "Everyday wellbeing essentials.", icon: "HeartPulse" },
] as const;

export const medicineSeed = [
  { name: "Paracetamol Tablets", genericName: "Paracetamol", brand: "Healwell", manufacturer: "Healwell Laboratories", category: "pain-relief", strength: "500 mg", packSize: "Strip of 10", pricePaise: 3200, discountPercent: 12, stock: 180, prescriptionRequired: false, popularity: 98, image: "/images/medicine-placeholder.svg" },
  { name: "Ibuprofen Tablets", genericName: "Ibuprofen", brand: "Reliva", manufacturer: "Reliva Healthcare", category: "pain-relief", strength: "200 mg", packSize: "Strip of 10", pricePaise: 4800, discountPercent: 8, stock: 92, prescriptionRequired: false, popularity: 84, image: "/images/medicine-placeholder.svg" },
  { name: "Diclofenac Tablets", genericName: "Diclofenac sodium", brand: "Diclora", manufacturer: "Northstar Pharma", category: "pain-relief", strength: "50 mg", packSize: "Strip of 10", pricePaise: 6500, discountPercent: 0, stock: 42, prescriptionRequired: true, popularity: 55, image: "/images/medicine-placeholder.svg" },
  { name: "Cetirizine Tablets", genericName: "Cetirizine hydrochloride", brand: "Allercalm", manufacturer: "ClearSpring Remedies", category: "cold-cough", strength: "10 mg", packSize: "Strip of 10", pricePaise: 3900, discountPercent: 10, stock: 115, prescriptionRequired: false, popularity: 88, image: "/images/medicine-placeholder.svg" },
  { name: "Cough Relief Syrup", genericName: "Herbal cough formulation", brand: "BreatheEasy", manufacturer: "GreenCross Health", category: "cold-cough", strength: "100 ml", packSize: "Bottle", pricePaise: 12500, discountPercent: 5, stock: 34, prescriptionRequired: false, popularity: 62, image: "/images/medicine-placeholder.svg" },
  { name: "Vitamin C Tablets", genericName: "Ascorbic acid", brand: "DailyKind", manufacturer: "DailyKind Nutrition", category: "vitamins", strength: "500 mg", packSize: "Bottle of 30", pricePaise: 18900, discountPercent: 15, stock: 76, prescriptionRequired: false, popularity: 90, image: "/images/medicine-placeholder.svg" },
  { name: "Vitamin D3 Softgels", genericName: "Cholecalciferol", brand: "Sunwise", manufacturer: "Sunwise Wellness", category: "vitamins", strength: "1000 IU", packSize: "Bottle of 30", pricePaise: 22500, discountPercent: 10, stock: 61, prescriptionRequired: false, popularity: 82, image: "/images/medicine-placeholder.svg" },
  { name: "Zinc Tablets", genericName: "Zinc gluconate", brand: "DailyKind", manufacturer: "DailyKind Nutrition", category: "vitamins", strength: "20 mg", packSize: "Bottle of 30", pricePaise: 14900, discountPercent: 0, stock: 48, prescriptionRequired: false, popularity: 70, image: "/images/medicine-placeholder.svg" },
  { name: "Oral Rehydration Salts", genericName: "Oral rehydration salts", brand: "HydraCare", manufacturer: "HydraCare Consumer Health", category: "digestive-health", strength: "WHO formula", packSize: "Pack of 5 sachets", pricePaise: 9500, discountPercent: 8, stock: 130, prescriptionRequired: false, popularity: 86, image: "/images/medicine-placeholder.svg" },
  { name: "Antacid Chewable Tablets", genericName: "Calcium carbonate", brand: "EaseDigest", manufacturer: "EaseDigest Labs", category: "digestive-health", strength: "500 mg", packSize: "Pack of 10", pricePaise: 7500, discountPercent: 5, stock: 70, prescriptionRequired: false, popularity: 67, image: "/images/medicine-placeholder.svg" },
  { name: "SPF 50 Sunscreen", genericName: "Broad spectrum sunscreen", brand: "DayShield", manufacturer: "DayShield Skin Sciences", category: "skin-care", strength: "SPF 50", packSize: "50 g tube", pricePaise: 34900, discountPercent: 15, stock: 28, prescriptionRequired: false, popularity: 77, image: "/images/medicine-placeholder.svg" },
  { name: "Moisturizing Lotion", genericName: "Daily moisturizing lotion", brand: "SoftLeaf", manufacturer: "SoftLeaf Consumer Care", category: "skin-care", strength: "Fragrance free", packSize: "200 ml bottle", pricePaise: 27900, discountPercent: 10, stock: 38, prescriptionRequired: false, popularity: 64, image: "/images/medicine-placeholder.svg" },
  { name: "Hand Sanitizer", genericName: "Alcohol-based hand sanitizer", brand: "PurePath", manufacturer: "PurePath Hygiene", category: "personal-care", strength: "70% v/v", packSize: "100 ml bottle", pricePaise: 8900, discountPercent: 0, stock: 200, prescriptionRequired: false, popularity: 75, image: "/images/medicine-placeholder.svg" },
  { name: "Digital Thermometer", genericName: "Digital clinical thermometer", brand: "SureTemp", manufacturer: "SureTemp Medical Devices", category: "first-aid", strength: "Oral / underarm", packSize: "1 device", pricePaise: 29900, discountPercent: 5, stock: 25, prescriptionRequired: false, popularity: 72, image: "/images/medicine-placeholder.svg" },
  { name: "Adhesive Bandages", genericName: "Sterile adhesive bandages", brand: "CarePatch", manufacturer: "CarePatch Supplies", category: "first-aid", strength: "Assorted sizes", packSize: "Pack of 20", pricePaise: 9900, discountPercent: 0, stock: 140, prescriptionRequired: false, popularity: 80, image: "/images/medicine-placeholder.svg" },
  { name: "Glucose Test Strips", genericName: "Blood glucose test strips", brand: "GlucoSure", manufacturer: "GlucoSure Diagnostics", category: "diabetes-care", strength: "Compatible with GlucoSure meters", packSize: "Pack of 25", pricePaise: 49900, discountPercent: 8, stock: 19, prescriptionRequired: false, popularity: 60, image: "/images/medicine-placeholder.svg" },
  { name: "Baby Gentle Wash", genericName: "Gentle baby cleansing wash", brand: "LittleHarbor", manufacturer: "LittleHarbor Family Care", category: "baby-care", strength: "Tear free", packSize: "200 ml bottle", pricePaise: 24900, discountPercent: 10, stock: 32, prescriptionRequired: false, popularity: 58, image: "/images/medicine-placeholder.svg" },
  { name: "Amoxicillin Capsules", genericName: "Amoxicillin", brand: "Amoxcare", manufacturer: "Northstar Pharma", category: "wellness", strength: "500 mg", packSize: "Strip of 10", pricePaise: 14500, discountPercent: 0, stock: 36, prescriptionRequired: true, popularity: 45, image: "/images/medicine-placeholder.svg" },
] as const;

export const standardMedicineDescription =
  "A pharmacy-listed healthcare product. Read the manufacturer's label and consult a licensed pharmacist or clinician for product-specific guidance.";
export const standardMedicineUsage =
  "Use only as directed on the product packaging or by a licensed healthcare professional. This listing is not medical advice.";
export const standardMedicineStorage =
  "Store as directed on the package, away from children, excess heat, and moisture.";
export const standardMedicineSafety =
  "Check the package for ingredients, warnings, expiry date, and interactions. Ask a licensed pharmacist if you have questions.";