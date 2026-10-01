# MEDICO

MEDICO is a Next.js and Convex pharmacy storefront with a sample catalog, account flows, cart, prescription storage/review, checkout, orders, and admin operations. It is a development foundation, not yet approved or configured for real pharmacy fulfilment.

## Technology

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Backend/database: Convex functions and Convex Database
- Authentication: Convex Auth email/password with optional Resend password recovery
- Payments: Razorpay Checkout; secrets remain on the Convex deployment
- Hosting: Vercel frontend and Convex Cloud backend

## Structure

```text
frontend/                 Next.js application, routes, components, styles
	app/                    Home, catalog, auth, cart, prescription, checkout, orders, account, admin
	components/             Reusable layout and commerce UI
	public/images/          Local placeholder assets
backend/
	convex/                 Schema, auth, queries, mutations, actions, webhook
	scripts/                Local auth-key generation helper
database/schema/          Planning notes; Convex is the only database
```

The checked-in `backend/convex/_generated/` TypeScript wrappers let the frontend build before a deployment is linked. Once a Convex project is configured, run Convex codegen and keep those wrappers in sync with the schema and function modules.

## Install and Run

Requirements: Node.js 20.9 or newer.

```powershell
npm.cmd --prefix frontend install
npm.cmd --prefix backend install
Copy-Item frontend/.env.example frontend/.env.local
npm.cmd --prefix frontend run dev
```

Open http://localhost:3000. With no Convex URL, the catalog shows explicitly labeled sample preview products; account, cart, upload, checkout, and admin actions stay disabled. No test or production payment is simulated. In PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

## Convex Setup

1. Run `npm.cmd --prefix backend run dev`, sign in to Convex when prompted, and create/select your development deployment.
2. Set `NEXT_PUBLIC_CONVEX_URL` in `frontend/.env.local` to that deployment's public Convex URL, then restart Next.js.
3. Generate auth signing keys with `node backend/scripts/generate-auth-keys.mjs`. Add the displayed `JWT_PRIVATE_KEY` and `JWKS` values to the selected Convex deployment's environment settings. Treat both as secrets. Convex provides `CONVEX_SITE_URL` to the deployment.
4. Run `npm.cmd --prefix backend run codegen` after linking the deployment. Keep the generated wrappers checked in so Vercel has the API/type files.
5. Set `MEDICO_SEED_TOKEN` on the development deployment, then run the `seed:seedSampleCatalog` mutation once through the Convex dashboard/function runner. The mutation is idempotent and refuses to run without the deployment secret.

Do not put Convex secrets in `frontend/.env.local`, client components, Git, or Vercel's public environment variables. `frontend/.env.example` contains only the public Convex URL.

## Authentication and Email

Email/password authentication is handled by Convex Auth. Signup validates name, email, password, and Indian mobile format. Password reset uses a Resend email-code flow. Add `RESEND_API_KEY` and a verified `AUTH_EMAIL_FROM` sender to the Convex deployment to enable recovery; it fails closed when they are missing. Email verification and mobile OTP verification are not configured, so do not use this setup for live pharmacy fulfilment until those requirements and applicable regulations are reviewed.

Convex Auth is currently beta. MEDICO performs client-side route redirects, while every private Convex function checks the authenticated identity and owner/admin role on the backend. Next.js server-side Convex Auth support remains experimental.

## Admin Bootstrap

1. Create a normal account through `/auth/signup` after Convex Auth is configured.
2. Set a strong `MEDICO_ADMIN_BOOTSTRAP_TOKEN` on the Convex deployment.
3. Invoke `admin:bootstrapFirstAdmin` from the Convex dashboard/function runner with the account email and token. Only the first configured admin can be bootstrapped this way; later role changes require an admin session.

Never place the bootstrap token in the frontend or commit it.

## Razorpay

1. Use Razorpay test credentials first. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as Convex deployment environment variables.
2. Set `RAZORPAY_WEBHOOK_SECRET` on Convex and configure Razorpay to POST payment/refund events to `https://<your-convex-site-domain>/razorpay/webhook`.
3. The backend creates Razorpay orders, verifies the returned HMAC signature, fetches the payment from Razorpay, checks amount/currency/captured status, and only then confirms the order and decrements inventory. Signed webhooks handle asynchronous payment/refund events.

MEDICO never stores card numbers or CVV. Cash on delivery, partial refunds, shipping-carrier integrations, and taxes/GST calculations are not implemented. A gateway callback alone cannot mark an order paid.

## Vercel and Production

Deploy the `frontend/` directory as the Vercel project root and set `NEXT_PUBLIC_CONVEX_URL` for each Vercel environment. Deploy functions/schema separately with `npm.cmd --prefix backend run deploy` after selecting the matching Convex deployment and setting all backend environment variables. Keep deployment environments (development, preview, production) separate.

Before any real launch, obtain pharmacy/legal review, verify product licensing and catalog data, configure contact verification and email sender domains, review prescription retention/access policy, test Razorpay test-mode callbacks and webhooks, configure fulfillment/tax/invoice rules, and conduct security/privacy/accessibility testing. The included catalog is sample data and the product guidance is deliberately generic.

## Checks

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
npm.cmd --prefix backend run typecheck
npm.cmd --prefix frontend audit
npm.cmd --prefix backend audit
```

## Common Setup Issues

- Sign-in shows “Account connection required”: set `NEXT_PUBLIC_CONVEX_URL`, configure Convex Auth deployment keys, and restart the frontend.
- Password reset cannot send mail: configure `RESEND_API_KEY` and a verified `AUTH_EMAIL_FROM` on the Convex deployment.
- Payment cannot start: configure Razorpay test/live credentials on the same Convex deployment used by the frontend.
- Payment is not confirmed: check the Convex logs and Razorpay payment status; confirmation requires matching amount, INR currency, a valid signature, and captured status.
- Sample products do not appear after connecting Convex: set `MEDICO_SEED_TOKEN` and run the guarded seed mutation once.
- Admin route denies access: bootstrap the first admin account from the Convex dashboard using `MEDICO_ADMIN_BOOTSTRAP_TOKEN`.

## Development Roadmap

The original 21-phase roadmap remains in progress: setup, storefront, authentication, catalog/search/details, categories, prescriptions, cart, addresses, checkout/payments, orders/tracking, cancellations/refunds, invoices, account, notifications, offers, admin/users, inventory, and production testing.