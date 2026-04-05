# Expense Feature — Epics & Stories Tracker

> **Started**: 2026-04-04
> **Status**: COMPLETED

---

## Epic 1: Database Schema & Migration
| # | Story | Status |
|---|-------|--------|
| 1.1 | Add `ExpenseCategory` model to Prisma schema | ✅ Done |
| 1.2 | Add `Expense` model to Prisma schema | ✅ Done |
| 1.3 | Add relations to Clinic, Branch, User models | ✅ Done |
| 1.4 | Run Prisma migration (`20260404162352_add_expense_tracking`) | ✅ Done |

## Epic 2: Expense Category Backend (CRUD + Defaults)
| # | Story | Status |
|---|-------|--------|
| 2.1 | Create DTOs (create, update) | ✅ Done |
| 2.2 | Create `ExpenseService` with category CRUD | ✅ Done |
| 2.3 | Create `ExpenseController` with category endpoints | ✅ Done |
| 2.4 | Auto-seed 10 default categories on first access | ✅ Done |

### Default Categories:
1. Rent & Utilities
2. Staff Salaries
3. Dental Supplies & Materials
4. Equipment Maintenance & Repair
5. Lab Fees
6. Marketing & Advertising
7. Software & Subscriptions
8. Insurance
9. Housekeeping & Waste Disposal
10. Taxes & Licenses

## Epic 3: Expense Backend (CRUD + Filters)
| # | Story | Status |
|---|-------|--------|
| 3.1 | Create DTOs (create, update, query, summary) | ✅ Done |
| 3.2 | Create `ExpenseService` with CRUD + filtered list + summary + trend | ✅ Done |
| 3.3 | Create `ExpenseController` with all endpoints | ✅ Done |
| 3.4 | Create `ExpenseModule` and register in `AppModule` | ✅ Done |

### API Endpoints:
- `GET /expense-categories` — list all (default + custom)
- `POST /expense-categories` — create custom category
- `PATCH /expense-categories/:id` — update/deactivate
- `DELETE /expense-categories/:id` — soft delete (custom only)
- `GET /expenses` — list with filters & pagination
- `GET /expenses/summary` — totals by category for date range
- `GET /expenses/trend` — monthly expense trend (last 6 months)
- `GET /expenses/:id` — single expense detail
- `POST /expenses` — create expense
- `PATCH /expenses/:id` — update
- `DELETE /expenses/:id` — delete
- `GET /reports/profit-loss` — revenue vs expenses with category breakdown

## Epic 4: Reports & Dashboard Integration
| # | Story | Status |
|---|-------|--------|
| 4.1 | Add `GET /reports/profit-loss` endpoint | ✅ Done |
| 4.2 | Update `GET /reports/dashboard-summary` with `this_month_expenses`, `this_month_revenue`, `net_profit` | ✅ Done |

## Epic 5: Frontend — Expense Service & Types
| # | Story | Status |
|---|-------|--------|
| 5.1 | Create TypeScript types for Expense, ExpenseCategory, ExpenseSummary, ProfitLoss | ✅ Done |
| 5.2 | Create `expenses.service.ts` API client | ✅ Done |
| 5.3 | Add expense export config | ✅ Done |
| 5.4 | Add `getProfitLoss` to reports service | ✅ Done |

## Epic 6: Frontend — Expenses Page
| # | Story | Status |
|---|-------|--------|
| 6.1 | Create expenses list page with table, filters (category, payment mode, search), pagination | ✅ Done |
| 6.2 | Create add/edit expense dialog with form validation (zod + react-hook-form) | ✅ Done |
| 6.3 | Create manage categories dialog (add, toggle active, delete) | ✅ Done |
| 6.4 | Add delete confirmation | ✅ Done |
| 6.5 | Add "Expenses" to sidebar navigation (desktop + mobile) | ✅ Done |
| 6.6 | Add loading page | ✅ Done |

## Epic 7: Frontend — Reports & Dashboard
| # | Story | Status |
|---|-------|--------|
| 7.1 | Add "This Month Revenue", "This Month Expenses", "Net Profit" stat cards to dashboard | ✅ Done |
| 7.2 | Create Expense Overview Widget (top 5 categories with progress bars) | ✅ Done |
| 7.3 | Update DashboardSummary type with new fields | ✅ Done |

---

## Access Control Matrix
| Role | View Expenses | Add/Edit | Delete | View P&L Report |
|------|:---:|:---:|:---:|:---:|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Receptionist | ✅ | ✅ | ❌ | ❌ |
| Dentist | ✅ | ❌ | ❌ | ❌ |
| Staff | ❌ | ❌ | ❌ | ❌ |

---

## Files Created/Modified

### Backend (New Files)
- `prisma/migrations/20260404162352_add_expense_tracking/migration.sql`
- `src/modules/expense/expense.module.ts`
- `src/modules/expense/expense.service.ts`
- `src/modules/expense/expense.controller.ts`
- `src/modules/expense/dto/create-expense.dto.ts`
- `src/modules/expense/dto/update-expense.dto.ts`
- `src/modules/expense/dto/query-expense.dto.ts`
- `src/modules/expense/dto/create-expense-category.dto.ts`
- `src/modules/expense/dto/update-expense-category.dto.ts`
- `src/modules/expense/dto/expense-summary-query.dto.ts`
- `src/modules/expense/dto/index.ts`

### Backend (Modified Files)
- `prisma/schema.prisma` — added ExpenseCategory + Expense models + relations
- `src/app.module.ts` — registered ExpenseModule
- `src/modules/reports/reports.service.ts` — added expense fields to dashboard summary + profit-loss endpoint
- `src/modules/reports/reports.controller.ts` — added profit-loss route

### Frontend (New Files)
- `src/services/expenses.service.ts`
- `src/app/(dashboard)/expenses/page.tsx`
- `src/app/(dashboard)/expenses/loading.tsx`
- `src/app/(dashboard)/expenses/_components/expense-dialog.tsx`
- `src/app/(dashboard)/expenses/_components/category-dialog.tsx`
- `src/app/(dashboard)/dashboard/_components/expense-overview-widget.tsx`

### Frontend (Modified Files)
- `src/types/index.ts` — added Expense, ExpenseCategory, ExpenseSummary, ProfitLoss types + updated DashboardSummary
- `src/services/reports.service.ts` — added getProfitLoss
- `src/lib/export.ts` — added expenses export config
- `src/components/layout/sidebar.tsx` — added Expenses nav item
- `src/components/layout/mobile-sidebar.tsx` — added Expenses nav item
- `src/app/(dashboard)/dashboard/page.tsx` — added expense stat cards + overview widget
