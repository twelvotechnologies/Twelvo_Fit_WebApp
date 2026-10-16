# Gym ERP Backend (TypeScript)

A modular, enterprise-ready backend architecture for Gym ERP built with **TypeScript**, **Express.js** on **Port 3000**, **Prisma ORM**, **Swagger (OpenAPI 3.0)**, and built-in integration for **Fastify**.

---

## 🚀 Key Features

- **TypeScript First**: Full type safety with modern ES Modules and `NodeNext` resolution.
- **Port 3000 Default**: Pre-configured via `.env` (`PORT=3000`).
- **Prisma ORM**:
  - Schema defined in `prisma/schema.prisma` with `Member` model.
  - Zero-config SQLite local database (`dev.db`) with one-line switch to PostgreSQL.
  - Singleton client management with connection lifecycle hooks.
- **Swagger / OpenAPI 3.0**:
  - Interactive Swagger UI available at `http://localhost:3000/api-docs`.
  - Raw OpenAPI JSON schema at `http://localhost:3000/api-docs.json`.
  - Configured Helmet Content Security Policy for flawless asset rendering.
- **Clean Layered Architecture**:
  - **Controllers**: Handle HTTP requests/responses (Express or Fastify).
  - **Services**: 100% framework-agnostic business logic powered by Prisma.
  - **Middlewares**: Centralized error handling and 404 router.
  - **Types**: Dedicated TypeScript interfaces and DTOs.
- **Fastify Integration Ready**: Reuses the exact same Prisma-backed services and business logic. Run either Express (Port 3000), Fastify (Port 3001), or both!

---

## 📁 Project Structure

```text
gym-erp/
└── server/
    ├── .env                  # PORT=3000, FASTIFY_PORT=3001, DATABASE_URL="file:./dev.db"
    ├── .env.example
    ├── .gitignore
    ├── package.json          # Express, Fastify, Prisma, Swagger, TypeScript, tsx
    ├── tsconfig.json         # ES2022, NodeNext resolution, strict typing
    ├── README.md
    ├── prisma/
    │   ├── schema.prisma     # Prisma database schema (Member model)
    │   ├── seed.ts           # Initial database seeder
    │   └── dev.db            # Local SQLite database
    ├── dist/                 # Compiled JavaScript output
    └── src/
        ├── app.ts            # Express app setup (Helmet, CORS, Swagger UI, routes)
        ├── server.ts         # Express server entry point (Port 3000)
        ├── config/
        │   ├── env.ts        # Typed environment configuration
        │   ├── prisma.ts     # Singleton Prisma Client & lifecycle hooks
        │   └── swagger.ts    # OpenAPI 3.0 specification & swagger-jsdoc setup
        ├── types/
        │   ├── api.types.ts  # Standard ApiResponse and Health interfaces
        │   └── member.types.ts # Member entity, DTOs & status types
        ├── utils/
        │   ├── apiResponse.ts # Uniform JSON response formatter
        │   └── logger.ts     # Colorized timestamp logger
        ├── services/         # Pure business logic (Prisma-backed)
        │   ├── health.service.ts
        │   └── member.service.ts
        ├── controllers/      # Express controllers
        │   ├── health.controller.ts
        │   └── member.controller.ts
        ├── routes/           # Express router definitions with OpenAPI JSDoc
        │   ├── index.ts      # Root API router (/api/v1)
        │   ├── health.routes.ts
        │   └── member.routes.ts
        ├── middlewares/
        │   ├── errorHandler.ts # Centralized error handler
        │   └── notFound.ts     # 404 route handler
        └── fastify/          # Fastify Integration
            ├── fastifyApp.ts    # Fastify server instance reusing shared services
            └── fastifyServer.ts # Standalone Fastify runner (Port 3001)
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Initialize Database & Generate Prisma Client
```bash
npm run prisma:push
npm run db:seed
```

### 3. Run Express Server (Port 3000)
Development mode with hot-reload via `tsx`:
```bash
npm run dev
```

Production build and start:
```bash
npm run build
npm start
```

### 4. Interactive Swagger Documentation
Open your browser to:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

---

## 📦 Database Scripts & Migrations (PostgreSQL)

| Command | Description |
|---|---|
| `npm run db:migrate` | Runs `runMigration.ts` — applies `consolidated_schema_v1.sql` (tables, functions, triggers) and verifies integrity |
| `npm run db:rollback` | Runs `rollbackMigration.ts` — tears down tables, triggers, and functions |
| `npm run prisma:generate` | Regenerates `@prisma/client` from `prisma/schema.prisma` |
| `npm run prisma:migrate` | Runs `prisma migrate dev` against PostgreSQL |
| `npm run prisma:deploy` | Applies production migrations via `prisma migrate deploy` |
| `npm run prisma:studio` | Opens interactive visual database GUI in browser |
| `npm run db:seed` | Seeds initial demonstration data into database |

---

## 🏛️ Consolidated Schema (v1) Architecture & Triggers

The database features 11 multi-tenant modules with automatic triggers and code generators:

1. **Tenants (`tenants`)**: Gym organizations with unique prefixes (e.g., `SA`), subscription plans, and status tracking.
2. **Plans (`plans`)**: SaaS subscription tiers sold to gym owners.
3. **Users (`users`)**: Multi-tenant authentication (`gym_owner`, `trainer`, `other`).
4. **Shared Functions & Counters (`tenant_code_counters`)**:
   - `trg_set_updated_at()`: Automatically bumps `updated_at = now()` on record updates.
   - `generate_entity_code()`: Atomic incrementing counter generating readable identifiers (e.g. `SATR1001`, `SAMS1001`, `SARC1001`).
5. **Staff (`staff`)**: Trainers and employees with auto-generated staff codes (`before_staff_insert`).
6. **Plans Catalog (`plans_catalog`)**: Gym-specific membership tiers (Regular, Personal Training, etc.).
7. **Members (`members`)**: Member records with auto-generated codes (`before_members_insert`), trainer links, and plan subscriptions.
8. **Bank Accounts (`bank_accounts`)**: Bank ledger with `trg_set_signed_balance()` trigger converting positive inputs to signed balances based on receivable/payable types.
9. **UPI IDs (`upi_ids`)**: Multi-UPI handle registry mapped to parent bank accounts.
10. **Cash Transactions (`cash_transactions`)**: Cash-in-hand ledger enforcing exactly one opening balance row per tenant.
11. **Receipts & History (`receipts`, `receipt_approval_history`)**:
   - `trg_set_receipt_code()`: Auto-generates receipt codes on insert.
   - `trg_log_receipt_status_change()`: Audit timeline automatically logging all approval changes (Pending -> Accepted / Rejected / Cancelled).
   - `trg_apply_accepted_receipt_to_member()`: Automatically updates the member's `current_plan_id`, `status = 'ACTIVE'`, and advances `next_due_date` by plan duration upon receipt approval.

