# Inventory

Implemented in `../../backend/convex/schema.ts` and linked to medicines by `medicineId`.

Fields: `medicineId`, `stock`, `lowStockThreshold`, `updatedAt`.

Index: `by_medicine` on `medicineId`.

The sample catalog seed in `../../backend/convex/seed.ts` creates an inventory document for each medicine. The medicine document also stores `stock` for catalog filtering and display.