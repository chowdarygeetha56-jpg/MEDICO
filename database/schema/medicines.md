# Medicines

Implemented in `../../backend/convex/schema.ts`. Medicine documents reference categories through `categoryId`; the seed converts each source category slug into that database ID.

Fields:

- Identity and catalog: `name`, `genericName`, `brand`, `manufacturer`, `categoryId`
- Product information: `description`, `usageInfo`, `storageInfo`, `safetyInfo`, `strength`, `packSize`, `image`
- Commerce and availability: `pricePaise`, `discountPercent`, `stock`, `prescriptionRequired`, `active`, `popularity`
- Timestamps: `createdAt`, `updatedAt`

Indexes: `by_category` on `categoryId, active`; `by_active_popularity` on `active, popularity`.

Prices are stored in paise. The token-protected sample catalog seed in `../../backend/convex/seed.ts` populates these fields from `../../backend/convex/seedData.ts` and adds standard product guidance text.