# Categories

Implemented in `../../backend/convex/schema.ts` and queried by the storefront.

Fields:

- `name`, `slug`, `description`, `icon`
- `sortOrder`, `active`, `createdAt`

Index: `by_slug` on `slug`.

The catalog seed creates categories from `../../backend/convex/seedData.ts`, assigning display order from their position in the seed list. Seed definitions are not database records until the seed mutation runs.