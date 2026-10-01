/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as coupons from "../coupons.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as invoices from "../invoices.js";
import type * as medicines from "../medicines.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as paymentActions from "../paymentActions.js";
import type * as payments from "../payments.js";
import type * as prescriptions from "../prescriptions.js";
import type * as razorpayWebhook from "../razorpayWebhook.js";
import type * as refunds from "../refunds.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  admin: typeof admin;
  auth: typeof auth;
  cart: typeof cart;
  categories: typeof categories;
  coupons: typeof coupons;
  http: typeof http;
  inventory: typeof inventory;
  invoices: typeof invoices;
  medicines: typeof medicines;
  notifications: typeof notifications;
  orders: typeof orders;
  paymentActions: typeof paymentActions;
  payments: typeof payments;
  prescriptions: typeof prescriptions;
  razorpayWebhook: typeof razorpayWebhook;
  refunds: typeof refunds;
  seed: typeof seed;
  seedData: typeof seedData;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
