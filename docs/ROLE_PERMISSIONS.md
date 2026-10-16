# Twelvo Gym ERP — Role-Based Access Control (RBAC) & Permissions Guide

This document details user roles, module permissions, UI visibility, and backend security guards across the Twelvo Gym ERP platform.

---

## 1. System Role Hierarchy

| Role Key | Role Title | Scope | Primary Responsibility | Default Landing Screen |
| :--- | :--- | :--- | :--- | :--- |
| `gym_owner` | **Gym Owner / Admin** | Single Tenant | Full administrative, operational, and financial control over the gym facility. | `/` (Dashboard) |
| `trainer` | **Floor Trainer / Coach** | Single Tenant | Day-to-day floor operations: recording member payments and onboarding new athletes. | `/receipts` (Receipts) |
| `super_admin` | **Platform Super Admin** | Multi-Tenant Platform | Tenant lifecycle management, gym account activation, and subscription billing. | `/admin/tenants` |

---

## 2. Master Module Permissions Matrix

| Module / Screen | Route | Gym Owner (`gym_owner`) | Floor Trainer (`trainer`) | Super Admin (`super_admin`) |
| :--- | :--- | :---: | :---: | :---: |
| **Dashboard** | `/` | **Full Access** | **No Access** (Redirected to `/receipts`) | **Full Access** |
| **Receipts & Ledger** | `/receipts` | **Full Access** (Record, Verify, Approve/Reject) | **Limited** (Record as draft, View details) | **Full Access** |
| **Member Management** | `/members` | **Full Access** (Roster, Onboard, Renew, Due Override) | **Limited** (View roster, Submit onboarding draft) | **Full Access** |
| **Trainer Directory** | `/trainers` | **Full Access** (Add, Update salary, Delete) | **No Access** (Hidden & Protected) | **Full Access** |
| **Payroll & Payouts** | `/payroll` | **Full Access** (Payouts, Attendance, Slips) | **No Access** (Hidden & Protected) | **Full Access** |
| **Reports & Analytics** | `/reports` | **Full Access** (Financials, GST, Exports) | **No Access** (Hidden & Protected) | **Full Access** |
| **Inventory & Assets** | `/inventory` | **Full Access** (Stock, Maintenance) | **No Access** (Hidden & Protected) | **Full Access** |
| **Settings & Catalog** | `/settings` | **Full Access** (Plans, Banks, Taxes) | **No Access** (Hidden & Protected) | **Full Access** |
| **Super Admin Console** | `/admin/tenants` | **No Access** | **No Access** | **Full Access** |

---

## 3. Module Breakdown & Exact Permissions

### 3.1. Dashboard (`/`)
- **Gym Owner / Admin**:
  - Live revenue indicators (Today, This Month, Annual).
  - Active athlete count, expiring memberships, and overdue collections.
  - Financial charts and quick-action shortcuts.
- **Floor Trainer**:
  - **Hidden & Blocked**: The link does not appear in the sidebar navigation.
  - Automatic redirect: Visiting `/` immediately routes to `/receipts`.

---

### 3.2. Receipts Module (`/receipts`)
- **Gym Owner / Admin**:
  - **Record Payment**: Automatically tagged as `admin` / `gym_owner`. Marked **Auto-Verified** and advances member billing cycle immediately.
  - **Verified Ledger Tab**: Full historical audit view with search and GST slip printing.
  - **Pending Verification Tab**: Exclusive access to **Review & Verify** queue. Can approve (generates immutable receipt and updates member due date) or reject with mandatory reason.
- **Floor Trainer**:
  - **Record Payment**: 
    - No manual role toggle needed; system detects trainer session automatically.
    - Submit button reads `Submit for Admin Approval`.
    - Receipt is created in `approvalStatus: 1` (`Pending Approval`).
    - Does **not** alter gym revenue or due dates until approved.
  - **Verified Ledger Tab**: Full read-only search access (for verifying member payment proof on the floor).
  - **Pending Verification Tab**: Read-only tracking with **View Details** action. Trainers **cannot** approve or reject submissions.

---

### 3.3. Member Management (`/members`)
- **Gym Owner / Admin**:
  - Full access to athlete profiles, contact info, and membership history.
  - Direct member creation (New Registration or Backfill) with immediate account activation.
  - Manual Next Due Date override drawer.
  - Exclusive access to **Review & Verify** trainer athlete onboarding submissions.
- **Floor Trainer**:
  - View member roster and assigned trainer info.
  - Onboard new athletes from the floor (queued under Pending Registrations).
  - Read-only inspection (**View Details**) of pending registrations.
  - Due date overrides are hidden/restricted.

---

### 3.4. Administrative Modules (Trainers, Payroll, Reports, Inventory, Settings)
- **Trainers (`/trainers`)**:
  - Only Gym Owners / Super Admins can add coaches, edit compensation, or manage credentials.
  - Hidden and route-blocked for trainers to protect confidential staff compensation data.
- **Payroll (`/payroll`)**:
  - Only Gym Owners / Super Admins can calculate payouts, view commissions, and disburse salaries.
- **Reports (`/reports`)**:
  - Confidential revenue and tax analytics restricted to administrative staff.
- **Inventory (`/inventory`) & Settings (`/settings`)**:
  - Asset tracking, plan pricing, bank accounts, and gym configurations restricted to admins.

---

## 4. Technical Guard Implementation

1. **Client-Side Guard (`ProtectedRoute`)**:
   - `client/src/routes/index.tsx` checks `user.role` against `allowedRoles`.
   - `client/src/layouts/Sidebar.tsx` dynamically filters navigation items.
2. **Server-Side Guard (`requireRoles`)**:
   - Endpoints like `/api/v1/receipts/:id/approve`, `/api/v1/receipts/:id/reject`, and `/api/v1/trainers` enforce `requireRoles('gym_owner', 'super_admin')`.
3. **Database-Level Integrity**:
   - `ReceiptService.createReceipt` forces `approvalStatus = 1` for all requests originating from a `trainer` token, preventing client-side parameter tampering.
