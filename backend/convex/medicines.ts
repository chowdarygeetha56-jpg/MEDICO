import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

function compareOptionalNumbers(a: number | undefined, b: number | undefined, direction: 1 | -1) {
	if (a === undefined) return b === undefined ? 0 : 1;
	if (b === undefined) return -1;
	return (a - b) * direction;
}

function sellingPricePaise(medicine: { pricePaise?: number; discountPercent?: number; priceSource?: string }) {
	if (medicine.pricePaise === undefined) return undefined;
	if (medicine.priceSource === "MEDICO_DEMO") return medicine.pricePaise;
	return Math.round((medicine.pricePaise * (100 - (medicine.discountPercent ?? 0))) / 100);
}

const fdaRecordValidator = v.object({
	sourceId: v.string(),
	name: v.string(),
	genericName: v.optional(v.string()),
	brand: v.optional(v.string()),
	manufacturer: v.optional(v.string()),
	activeIngredients: v.optional(v.array(v.object({ name: v.string(), strength: v.optional(v.string()) }))),
	strength: v.optional(v.string()),
	dosageForm: v.optional(v.string()),
	route: v.optional(v.array(v.string())),
	productType: v.optional(v.string()),
	packageDescription: v.optional(v.string()),
	packageIdentifiers: v.optional(v.array(v.string())),
	therapeuticClass: v.optional(v.array(v.string())),
	prescriptionRequired: v.optional(v.boolean()),
	prescriptionStatus: v.optional(v.string()),
	sourceUpdatedAt: v.optional(v.string()),
	categoryName: v.optional(v.string()),
	categorySlug: v.optional(v.string()),
});

const importedFields = [
	"name", "genericName", "brand", "manufacturer", "activeIngredients", "strength", "dosageForm", "route",
	"productType", "packageDescription", "packageIdentifiers", "therapeuticClass", "prescriptionRequired",
	"prescriptionStatus", "sourceUpdatedAt",
] as const;

function sameImportedFields(existing: Record<string, unknown>, incoming: Record<string, unknown>, categoryId?: Id<"categories">) {
	return importedFields.every((field) => JSON.stringify(existing[field] ?? null) === JSON.stringify(incoming[field] ?? null)) &&
		existing.categoryId === categoryId;
}

type StoreMedicine = Doc<"medicines"> & Required<Pick<Doc<"medicines">,
	"genericName" | "brand" | "manufacturer" | "categoryId" | "description" | "usageInfo" | "storageInfo" |
	"safetyInfo" | "strength" | "packSize" | "pricePaise" | "discountPercent" | "image" | "stock" |
	"prescriptionRequired" | "popularity"
>>;

function hasStoreDetails(medicine: Doc<"medicines">): medicine is StoreMedicine {
	return medicine.genericName !== undefined && medicine.brand !== undefined && medicine.manufacturer !== undefined &&
		medicine.categoryId !== undefined && medicine.description !== undefined && medicine.usageInfo !== undefined &&
		medicine.storageInfo !== undefined && medicine.safetyInfo !== undefined && medicine.strength !== undefined &&
		medicine.packSize !== undefined && medicine.pricePaise !== undefined && medicine.discountPercent !== undefined &&
		medicine.image !== undefined && medicine.stock !== undefined && medicine.prescriptionRequired !== undefined &&
		medicine.popularity !== undefined;
}

export const importFdaBatch = mutation({
	args: { token: v.string(), records: v.array(fdaRecordValidator) },
	handler: async (ctx, { token, records }) => {
		const expectedToken = process.env.FDA_IMPORT_TOKEN;
		if (!expectedToken || token !== expectedToken) throw new ConvexError("FDA import is not authorized.");
		if (records.length > 100) throw new ConvexError("Import batches are limited to 100 records.");

		const result = { inserted: 0, updated: 0, skipped: 0, invalid: 0, categoriesCreated: 0 };
		const categoryIds = new Map<string, Id<"categories">>();
		const now = Date.now();

		for (const record of records) {
			const sourceId = record.sourceId.trim();
			const name = record.name.trim();
			if (!sourceId || !name || name.length > 500) {
				result.invalid++;
				continue;
			}

			let categoryId: Id<"categories"> | undefined;
			const { categoryName, categorySlug, ...medicineRecord } = record;
			if (categoryName && categorySlug) {
				categoryId = categoryIds.get(categorySlug);
				if (!categoryId) {
					const existingCategory = await ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", categorySlug)).unique();
					if (existingCategory) {
						categoryId = existingCategory._id;
					} else {
						categoryId = await ctx.db.insert("categories", {
							name: categoryName,
							slug: categorySlug,
							description: `FDA/openFDA therapeutic class: ${categoryName}`,
							icon: "Pill",
							sortOrder: 1000,
							active: true,
							createdAt: now,
						});
						result.categoriesCreated++;
					}
					categoryIds.set(categorySlug, categoryId);
				}
			}

			const incoming = {
				...medicineRecord,
				name,
				categoryId,
				source: "openFDA-NDC",
			};
			const existing = await ctx.db.query("medicines").withIndex("by_source_id", (q) => q.eq("source", "openFDA-NDC").eq("sourceId", sourceId)).unique();
			if (existing) {
				if (sameImportedFields(existing, incoming, categoryId)) {
					result.skipped++;
					continue;
				}
				await ctx.db.patch(existing._id, { ...incoming, updatedAt: now });
				result.updated++;
				continue;
			}

			await ctx.db.insert("medicines", { ...incoming, active: true, createdAt: now, updatedAt: now });
			result.inserted++;
		}
		return result;
	},
});

function demoPricing(sourceId: string) {
	let hash = 2166136261;
	for (const character of sourceId) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
	const sellingPricePaise = (49 + (hash % 1450)) * 100;
	const targetDiscount = 8 + ((hash >>> 8) % 18);
	const mrpPaise = Math.ceil((sellingPricePaise * 100 / (100 - targetDiscount)) / 100) * 100;
	const discountPercent = Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100);
	const sku = `FDA-${sourceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48)}`;
	return { sellingPricePaise, mrpPaise, discountPercent, sku };
}

export const seedDemoStorePricingBatch = mutation({
	args: { token: v.string(), cursor: v.union(v.string(), v.null()) },
	handler: async (ctx, { token, cursor }) => {
		const expectedToken = process.env.MEDICO_STORE_PRICING_TOKEN;
		if (!expectedToken || token !== expectedToken) throw new ConvexError("Store pricing import is not authorized.");
		const page = await ctx.db.query("medicines")
			.withIndex("by_source_id", (q) => q.eq("source", "openFDA-NDC"))
			.paginate({ numItems: 100, cursor });
		const result = { priced: 0, skipped: 0, invalid: 0 };
		const now = Date.now();

		for (const medicine of page.page) {
			if (!medicine.active || medicine.pricePaise !== undefined || !medicine.sourceId) {
				result.skipped++;
				continue;
			}
			if (!Number.isSafeInteger(medicine.createdAt) || medicine.createdAt <= 0) {
				result.invalid++;
				continue;
			}

			const pricing = demoPricing(medicine.sourceId);
			await ctx.db.patch(medicine._id, {
				pricePaise: pricing.sellingPricePaise,
				mrpPaise: pricing.mrpPaise,
				discountPercent: pricing.discountPercent,
				currency: "INR",
				sku: medicine.sku ?? pricing.sku,
				vendorName: "MEDICO Demo Store",
				priceSource: "MEDICO_DEMO",
				updatedAt: now,
			});
			result.priced++;
		}

		return { ...result, continueCursor: page.continueCursor, isDone: page.isDone };
	},
});

export const list = query({
	args: {
		search: v.optional(v.string()),
		categoryId: v.optional(v.id("categories")),
		prescriptionRequired: v.optional(v.boolean()),
		inStockOnly: v.optional(v.boolean()),
		sort: v.optional(v.union(v.literal("popular"), v.literal("price-asc"), v.literal("price-desc"), v.literal("newest"))),
	},
	handler: async (ctx, args) => {
		const rows = args.categoryId
			? await ctx.db.query("medicines").withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!).eq("active", true)).take(200)
			: await ctx.db.query("medicines").withIndex("by_active", (q) => q.eq("active", true)).take(200);
		const needle = args.search?.trim().toLowerCase();
		const categoryIds = [...new Set(rows.flatMap((medicine) => medicine.categoryId ? [medicine.categoryId] : []))];
		const categoryNames = new Map(await Promise.all(categoryIds.map(async (categoryId) => {
			const category = await ctx.db.get(categoryId);
			return [categoryId, category?.name.toLowerCase() ?? ""] as const;
		})));
		const filtered = rows.filter((medicine) =>
			(!needle || [medicine.name, medicine.genericName ?? "", medicine.brand ?? "", ...(medicine.therapeuticClass ?? []), categoryNames.get(medicine.categoryId!) ?? ""].some((value) => value.toLowerCase().includes(needle))) &&
			(args.prescriptionRequired === undefined || medicine.prescriptionRequired === args.prescriptionRequired) &&
			(!args.inStockOnly || (medicine.stock ?? 0) > 0),
		);
		switch (args.sort) {
			case "price-asc": return filtered.sort((a, b) => compareOptionalNumbers(sellingPricePaise(a), sellingPricePaise(b), 1));
			case "price-desc": return filtered.sort((a, b) => compareOptionalNumbers(sellingPricePaise(a), sellingPricePaise(b), -1));
			case "newest": return filtered.sort((a, b) => b.createdAt - a.createdAt);
			default: return filtered.sort((a, b) => compareOptionalNumbers(a.popularity, b.popularity, -1));
		}
	},
});

export const getById = query({
	args: { id: v.id("medicines") },
	handler: async (ctx, { id }) => {
		const medicine = await ctx.db.get(id);
		return medicine?.active ? medicine : null;
	},
});

export const byCategorySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const category = await ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
		if (!category || !category.active) return { category: null, medicines: [] };
		const medicines = await ctx.db.query("medicines").withIndex("by_category", (q) => q.eq("categoryId", category._id).eq("active", true)).take(100);
		return { category, medicines: medicines.sort((a, b) => compareOptionalNumbers(a.popularity, b.popularity, -1)) };
	},
});

const medicineFields = {
	name: v.string(), genericName: v.string(), brand: v.string(), manufacturer: v.string(),
	categoryId: v.id("categories"), description: v.string(), usageInfo: v.string(),
	storageInfo: v.string(), safetyInfo: v.string(), strength: v.string(), packSize: v.string(),
	pricePaise: v.number(), discountPercent: v.number(), image: v.string(), prescriptionRequired: v.boolean(),
};

function validateMedicine(args: { name: string; pricePaise: number; discountPercent: number; strength: string; packSize: string }) {
	if (args.name.trim().length < 2 || !Number.isInteger(args.pricePaise) || args.pricePaise < 1) throw new ConvexError("Enter a product name and valid price in paise.");
	if (!Number.isInteger(args.discountPercent) || args.discountPercent < 0 || args.discountPercent > 90) throw new ConvexError("Discount must be between 0 and 90 percent.");
	if (!args.strength.trim() || !args.packSize.trim()) throw new ConvexError("Strength and pack size are required.");
}

export const adminCreate = mutation({
	args: medicineFields,
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		validateMedicine(args);
		if (!(await ctx.db.get(args.categoryId))?.active) throw new ConvexError("Select an active category.");
		const now = Date.now();
		const medicineId = await ctx.db.insert("medicines", { ...args, name: args.name.trim(), stock: 0, active: true, popularity: 0, createdAt: now, updatedAt: now });
		await ctx.db.insert("inventory", { medicineId, stock: 0, lowStockThreshold: 10, updatedAt: now });
		return medicineId;
	},
});

export const adminUpdate = mutation({
	args: { id: v.id("medicines"), ...medicineFields },
	handler: async (ctx, { id, ...args }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		validateMedicine(args);
		if (!(await ctx.db.get(id))) throw new ConvexError("Medicine not found.");
		if (!(await ctx.db.get(args.categoryId))?.active) throw new ConvexError("Select an active category.");
		await ctx.db.patch(id, { ...args, name: args.name.trim(), updatedAt: Date.now() });
	},
});

export const adminSetActive = mutation({
	args: { id: v.id("medicines"), active: v.boolean() },
	handler: async (ctx, { id, active }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		if (!(await ctx.db.get(id))) throw new ConvexError("Medicine not found.");
		await ctx.db.patch(id, { active, updatedAt: Date.now() });
	},
});

export const adminList = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId || (await ctx.db.get(userId))?.role !== "admin") throw new ConvexError("Administrator access required.");
		return (await ctx.db.query("medicines").order("desc").take(200)).filter(hasStoreDetails);
	},
});