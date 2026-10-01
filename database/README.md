# Database

Convex is the application's database. Its authoritative runtime schema is defined in `../backend/convex/schema.ts`; the Markdown files in `schema/` document those tables and indexes and are not a separate database.

Catalog seed records are defined in `../backend/convex/seedData.ts` and inserted by the token-protected mutation in `../backend/convex/seed.ts`. Defining a schema or seed record does not insert data into a deployment; the seed mutation must be run against the intended Convex deployment.