import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		if (!(await getAuthUserId(ctx))) throw new ConvexError("Sign in before uploading a prescription.");
		return ctx.storage.generateUploadUrl();
	},
});

export const create = mutation({
	args: { storageId: v.id("_storage"), fileName: v.string() },
	handler: async (ctx, { storageId, fileName }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in before submitting a prescription.");
		const metadata = await ctx.storage.getMetadata(storageId);
		if (!metadata) throw new ConvexError("The uploaded file could not be found.");
		if (!ACCEPTED_TYPES.has(metadata.contentType ?? "")) throw new ConvexError("Upload a JPG, PNG, or PDF file.");
		if (metadata.size > MAX_FILE_BYTES) throw new ConvexError("Prescription files must be 10 MB or smaller.");
		const prescriptionId = await ctx.db.insert("prescriptions", {
			userId,
			storageId,
			fileName: fileName.slice(0, 180),
			mimeType: metadata.contentType ?? "application/octet-stream",
			sizeBytes: metadata.size,
			status: "pending",
			createdAt: Date.now(),
		});
		return prescriptionId;
	},
});

export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const prescriptions = await ctx.db.query("prescriptions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
		return Promise.all(prescriptions.map(async (prescription) => ({ ...prescription, url: await ctx.storage.getUrl(prescription.storageId) })));
	},
});

export const remove = mutation({
	args: { id: v.id("prescriptions") },
	handler: async (ctx, { id }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new ConvexError("Sign in to manage prescriptions.");
		const prescription = await ctx.db.get(id);
		if (!prescription || prescription.userId !== userId) throw new ConvexError("Prescription not found.");
		if (prescription.status !== "pending") throw new ConvexError("Only pending prescriptions can be removed.");
		await ctx.storage.delete(prescription.storageId);
		await ctx.db.delete(id);
	},
});

export const adminList = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const user = await ctx.db.get(userId);
		if (user?.role !== "admin") throw new ConvexError("Administrator access required.");
		const prescriptions = await ctx.db.query("prescriptions").withIndex("by_status", (q) => q.eq("status", "pending")).take(100);
		return Promise.all(prescriptions.map(async (prescription) => ({ ...prescription, url: await ctx.storage.getUrl(prescription.storageId) })));
	},
});

export const review = mutation({
	args: { id: v.id("prescriptions"), decision: v.union(v.literal("approved"), v.literal("rejected")), note: v.string() },
	handler: async (ctx, { id, decision, note }) => {
		const reviewerId = await getAuthUserId(ctx);
		if (!reviewerId) throw new ConvexError("Administrator access required.");
		const reviewer = await ctx.db.get(reviewerId);
		if (reviewer?.role !== "admin") throw new ConvexError("Administrator access required.");
		const prescription = await ctx.db.get(id);
		if (!prescription || prescription.status !== "pending") throw new ConvexError("This prescription is no longer awaiting review.");
		const reviewNote = note.trim().slice(0, 500);
		await ctx.db.patch(id, { status: decision, reviewerId, reviewNote, reviewedAt: Date.now() });
		await ctx.db.insert("notifications", {
			userId: prescription.userId,
			title: decision === "approved" ? "Prescription approved" : "Prescription needs attention",
			message: reviewNote || (decision === "approved" ? "Your prescription has been approved." : "Please check the prescription review note."),
			type: "prescription",
			createdAt: Date.now(),
		});
	},
});