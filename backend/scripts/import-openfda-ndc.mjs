import { createHash } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { unzipSync } from "fflate";

const sourceUrl = "https://download.open.fda.gov/drug/ndc/drug-ndc-0001-of-0001.json.zip";
const sourceName = "openFDA-NDC";
const batchSize = 100;
const dryRun = process.argv.includes("--dry-run");
const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
const api = anyApi;

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function textList(value) {
  return Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : [];
}

function slugForCategory(name) {
  const slug = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  const suffix = createHash("sha256").update(name.trim().toLowerCase()).digest("hex").slice(0, 10);
  return `fda-${slug || "class"}-${suffix}`;
}

function dateIsCurrent(record) {
  const startDate = text(record.marketing_start_date);
  const endDate = text(record.marketing_end_date);
  const listingExpiration = text(record.listing_expiration_date);
  return (!startDate || startDate <= today) &&
    (!endDate || endDate >= today) &&
    (!listingExpiration || listingExpiration >= today);
}

function mapRecord(record, sourceUpdatedAt) {
  if (record.finished !== true || !text(record.product_type)?.startsWith("HUMAN") || !dateIsCurrent(record)) {
    return { status: "skipped" };
  }

  const sourceId = text(record.product_id) ?? text(record.product_ndc);
  const activeIngredients = Array.isArray(record.active_ingredients)
    ? record.active_ingredients.flatMap((ingredient) => {
      const name = text(ingredient?.name);
      if (!name) return [];
      const strength = text(ingredient?.strength);
      return [{ name, ...(strength ? { strength } : {}) }];
    })
    : [];
  const genericName = text(record.generic_name) ?? (activeIngredients.map((item) => item.name).join(" / ") || undefined);
  const brand = text(record.brand_name);
  const name = brand ?? genericName ?? activeIngredients[0]?.name;
  if (!sourceId || !name) return { status: "invalid" };

  const openfda = record.openfda && typeof record.openfda === "object" ? record.openfda : {};
  const therapeuticClass = textList([
    ...textList(openfda.pharm_class_epc),
    ...textList(openfda.pharm_class_moa),
    ...textList(openfda.pharm_class_cs),
    ...textList(openfda.pharm_class_pe),
  ]);
  const categoryName = therapeuticClass[0];
  const packageRecords = Array.isArray(record.packaging) ? record.packaging : [];
  const packageDescription = [...new Set(packageRecords.map((item) => text(item?.description)).filter(Boolean))].join("; ") || undefined;
  const packageIdentifiers = textList([record.product_ndc, ...packageRecords.map((item) => item?.package_ndc)]);
  const ingredientStrengths = [...new Set(activeIngredients.map((item) => item.strength).filter(Boolean))];
  const productType = text(record.product_type);
  const prescriptionRequired = productType === "HUMAN PRESCRIPTION DRUG"
    ? true
    : productType === "HUMAN OTC DRUG"
      ? false
      : undefined;
  const manufacturer = text(openfda.manufacturer_name?.[0]) ?? text(record.labeler_name);
  const dosageForm = text(record.dosage_form);
  const route = textList(record.route);

  return {
    status: "valid",
    record: {
      sourceId,
      name,
      ...(genericName ? { genericName } : {}),
      ...(brand ? { brand } : {}),
      ...(manufacturer ? { manufacturer } : {}),
      ...(activeIngredients.length ? { activeIngredients } : {}),
      ...(ingredientStrengths.length ? { strength: ingredientStrengths.join("; ") } : {}),
      ...(dosageForm ? { dosageForm } : {}),
      ...(route.length ? { route } : {}),
      ...(productType ? { productType, prescriptionStatus: productType } : {}),
      ...(packageDescription ? { packageDescription } : {}),
      ...(packageIdentifiers.length ? { packageIdentifiers } : {}),
      ...(therapeuticClass.length ? { therapeuticClass } : {}),
      ...(prescriptionRequired === undefined ? {} : { prescriptionRequired }),
      ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}),
      ...(categoryName ? { categoryName, categorySlug: slugForCategory(categoryName) } : {}),
    },
  };
}

console.log(`Downloading ${sourceName} from ${sourceUrl}`);
const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(180_000) });
if (!response.ok) throw new Error(`FDA download failed: HTTP ${response.status}`);

let archive = new Uint8Array(await response.arrayBuffer());
const files = unzipSync(archive);
archive = new Uint8Array(0);
const jsonEntry = Object.entries(files).find(([name]) => name.toLowerCase().endsWith(".json"));
if (!jsonEntry) throw new Error("The FDA archive did not contain a JSON dataset.");

const payload = JSON.parse(new TextDecoder().decode(jsonEntry[1]));
const records = payload?.results;
if (!Array.isArray(records)) throw new Error("The FDA archive is missing its results array.");
const sourceUpdatedAt = text(payload?.meta?.last_updated);
console.log(`Source update: ${sourceUpdatedAt ?? "not provided"}; raw records: ${records.length}`);

const client = dryRun ? null : new ConvexHttpClient(process.env.CONVEX_URL ?? "");
if (!dryRun && (!process.env.CONVEX_URL || !process.env.FDA_IMPORT_TOKEN)) {
  throw new Error("Set CONVEX_URL and FDA_IMPORT_TOKEN in backend/.env.local or the process environment.");
}

const totals = { inserted: 0, updated: 0, skipped: 0, invalid: 0, categoriesCreated: 0 };
let batch = [];
let validRecords = 0;
const categories = new Set();

async function flushBatch() {
  if (!batch.length) return;
  if (dryRun) {
    batch = [];
    return;
  }
  const result = await client.mutation(api.medicines.importFdaBatch, {
    token: process.env.FDA_IMPORT_TOKEN,
    records: batch,
  });
  for (const key of Object.keys(totals)) totals[key] += result[key] ?? 0;
  batch = [];
}

for (const sourceRecord of records) {
  const mapped = mapRecord(sourceRecord, sourceUpdatedAt);
  if (mapped.status === "skipped") {
    totals.skipped++;
    continue;
  }
  if (mapped.status === "invalid") {
    totals.invalid++;
    continue;
  }

  validRecords++;
  if (mapped.record.categorySlug) categories.add(mapped.record.categorySlug);
  batch.push(mapped.record);
  if (batch.length >= batchSize) await flushBatch();
  if (validRecords % 10_000 === 0) console.log(`Validated ${validRecords} source records...`);
}
await flushBatch();

if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, candidateRecords: validRecords, distinctCategories: categories.size, skipped: totals.skipped, invalid: totals.invalid }, null, 2));
} else {
  console.log(JSON.stringify(totals, null, 2));
}