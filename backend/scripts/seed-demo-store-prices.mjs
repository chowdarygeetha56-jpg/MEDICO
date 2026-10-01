import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const api = anyApi;
const deploymentUrl = process.env.CONVEX_URL;
const token = process.env.MEDICO_STORE_PRICING_TOKEN;

if (!deploymentUrl || !token) {
  throw new Error("Set CONVEX_URL and MEDICO_STORE_PRICING_TOKEN in backend/.env.local or the process environment.");
}

const client = new ConvexHttpClient(deploymentUrl);
const totals = { priced: 0, skipped: 0, invalid: 0, batches: 0 };
let cursor = null;
let isDone = false;

while (!isDone) {
  const result = await client.mutation(api.medicines.seedDemoStorePricingBatch, { token, cursor });
  totals.priced += result.priced;
  totals.skipped += result.skipped;
  totals.invalid += result.invalid;
  totals.batches++;
  cursor = result.continueCursor;
  isDone = result.isDone;
  if (totals.batches % 100 === 0 || isDone) {
    console.log(`Completed batch ${totals.batches}: priced ${totals.priced}, skipped ${totals.skipped}, invalid ${totals.invalid}`);
  }
}

console.log(JSON.stringify(totals, null, 2));