## Create Invoice — Full-Stack Implementation Plan

A fully functional `CreateInvoice` page that opens wherever a "Create Invoice" action is triggered. Provider-agnostic, RBAC-enforced end-to-end (frontend PermissionGate + server-side checks + RLS), no hardcoded values inside components, all new CSS in `index.css`, all new icons in `Icon.jsx`, reusing every existing shared component.

### A. Centralized config & RBAC (no hardcoding anywhere in UI)
- **`src/identity/rbac/permissions.js`** — add `INVOICE_CREATE/READ/UPDATE/DELETE`, `CUSTOMER_CREATE/READ/UPDATE`, `PRODUCT_CREATE/READ/UPDATE` (permission-string constants only; UI imports these, never hardcodes strings).
- **`src/constants/index.js`** — add centralized invoice config block: default prefixes, payment modes, tax types (CGST/SGST/IGST), invoice statuses, supported attachment MIME types + max-files + max-size, default custom-header keys, default due-date offset, discount types, round-off behaviour. Single source of truth consumed by both page and service layer.

### B. Data model & security
- **`src/schema/models/index.js`** — add models `customers`, `products`, `product_categories`, `banks`, `signatures`, `invoices` (custom_headers/notes/terms/attachments as jsonb; totals columns; status), `invoice_items`, `invoice_payments`. All with `rls: true` + `created_by`.
- **`generate-sql.sql`** — append DDL for all tables, foreign keys, indexes, and **RLS policies** (owner/admin scoping — users read/update only rows they own or have full_access for), matching the existing model definitions. Reuse the existing `is_admin_user()` SECURITY DEFINER helper already defined in the repo to avoid recursion.
- **`server/api.js`** — add handlers (Supabase + memory parity) for `/api/customers`, `/api/products`, `/api/product-categories`, `/api/banks`, `/api/signatures`, `/api/invoices` (GET list, POST create, GET/PUT/DELETE by id), `/api/invoices/number` (generate + uniqueness check). Every handler gated by `cp()/checkPermission()` with the centralized permission constants.

### C. Provider-agnostic service + business layers (pages never touch providers)
- **`src/services/invoice/InvoiceService.js` + `index.js`** — thin client over the existing `api()` wrapper: customer/product/bank/signature CRUD + search, invoice number gen/unique-check, save/update invoice (with line items + payments), attachment upload via the existing storage/FileService. AI helpers delegate to the existing `src/services/ai` `aiService` (already provider-agnostic).
- **`src/business/invoice/calculations.js`** — pure functions: line total, subtotal, taxable amount, CGST/SGST/IGST split (same-state vs inter-state from customer state vs company state in settings), tax total, line + overall discount (% and fixed), additional charges (taxable/non-taxable), round-off, grand total. Memoized in the page.
- **`src/business/invoice/validation.js`** — field/row/section validators returning inline `{field, message}` maps (required, empty invoice, invalid customer/payment/tax/dates/qty/price), reused by both UI and server-echo.

### D. Reusable UI additions
- **`src/components/ui/Toggle.jsx`** — new standalone accessible switch (none exists today; `Register.jsx` uses raw `.toggle-switch` markup inline). One component reused across TDS/TCS/reverse-charge/e-waybill/e-invoice/round-off. (Not a duplicate — fills a gap.)
- **`src/components/ui/Checkbox.jsx`** — same rationale (Show Description, taxable charge toggles). One component, reused.
- All invoice sections live in **`src/components/invoice/`** and reuse `Card, Button, Field, Input, Select, Search, Dropdown, Modal, Badge, Table, Filter, EmptyState, Pagination, Icon`:
  - `InvoiceHeader.jsx` — back button, title, company name, prefix selector, editable invoice number + uniqueness check, Custom Headers / Settings actions, Save buttons.
  - `InvoiceDetails.jsx` — customer search (debounced) + select + auto-fill, Create/Edit Customer modal, invoice date, due date (auto-calc from offset), reference validation.
  - `CustomHeaders.jsx` — admin-defined header chips with add/remove/edit.
  - `ProductsToolbar.jsx` — category filter, product/barcode search, qty, Add to Bill, "Create Invoices with AI" (BETA badge), Show Description checkbox, settings.
  - `ProductsTable.jsx` — dynamic rows (#, name, qty, unit price, price-with-tax, discount, total), inline editing, duplicate, remove, Create/Edit Product modal; empty state when no rows.
  - `DiscountSection.jsx` — % + fixed discount, Additional Charges modal (add/edit/delete, taxable toggle), items summary.
  - `NotesTerms.jsx` — notes CRUD + textarea + AI Assistant; terms & conditions CRUD + predefined select.
  - `OptionsPanel.jsx` — reverse charge / e-waybill / e-invoice switches, Attach Files (drag & drop, multi-upload, preview, delete, type/size/count validation).
  - `SummaryCard.jsx` — TDS/TCS toggles, extra discount dropdown, taxable amount, total tax, round off, total discount, total amount — live from calculations.
  - `BankSection.jsx` — bank selector + add/edit/remove/default bank modal.
  - `PaymentSection.jsx` — notes, amount, date, mode, Mark Fully Paid, split payment, balance calc, multiple records, validation.
  - `SignatureSection.jsx` — selector, add/upload/create/delete, preview.
  - `InvoiceFooter.jsx` — branding, copyright, security badge.

### E. Main page
- **`src/pages/invoices/CreateInvoice.jsx`** — orchestrates all sections. State via `useReducer` (one invoice model), calculations via `useMemo`, debounced searches via existing `useDebounce`, save/draft/update with loading + success/error toasts (existing `notificationManager`), unsaved-changes detection, inline validation. **`PermissionGate` wraps every protected control** (create customer/product/bank/signature, save, AI); route itself guarded.

### F. Routing & nav
- **`src/App.jsx`** — `/invoices/new` under `ProtectedRoute` with `PERMISSIONS.INVOICE_CREATE` (+ a `/invoices` list route guarded by `INVOICE_READ`, pointed at a minimal placeholder so the nav entry isn't broken until the list design arrives).
- **`src/routes/navigation.js`** — add an "Invoices" nav item (icon `doc`/`file-text`) gated by `INVOICE_READ`.

### G. Icons (all lucide-line paths, added only to `Icon.jsx`)
Add the missing ones needed by the UI: `arrowLeft`, `calculator`, `receipt`, `percentage`, `filePlus`, `sparkles`, `image`, `landmark` (bank), `penTool`/`signature`, `dollar`/`indian-rupee`, `split`, `truck`, `waypoints`, `fileCheck`, `userCheck`, `tag`, `package`, `barcode`, `settings2`, `chevronRight`, `externalLink`, `lock`/`shieldCheck`. No inline SVG in components; no duplicates of existing entries.

### H. CSS (all appended to `src/css/index.css`)
- A single `/* ===== CREATE INVOICE ===== */` block: two-column workspace grid (main left + sticky summary right), header bar, chips, products table (editable cells, compact), discount/charges rows, switch rows, summary rows, bank/payment/signature cards, attachments dropzone, footer.
- Design tokens only (no hex literals; all via existing `--*` vars so dark theme + white-label work automatically).
- **Responsive**: ≥1024px two-column; tablet (768–1023) collapses summary under main in logical reading order via a responsive grid; ≤767px stacks all sections vertically with footer actions pinned/accessible. Desktop breakpoints (1920→1024) stay full-width via the grid; layout is not altered.

### I. Verify
- Run `npm run build` (vite) — must pass with no errors/warnings from the new code; confirm no unused imports/TODOs/placeholders.

### Conformance checklist (acceptance)
Route + every protected UI action gated by PermissionGate ✓ · unauthorized get standard fallback ✓ · server-side auth enforced even with client gate ✓ · RLS on every invoice table ✓ · all permission strings centralized ✓ · pages talk only to service layer (no provider imports) ✓ · only existing shared components + 2 new generic primitives reused ✓ · CSS only in index.css · icons only in Icon.jsx ✓ · no hardcoded values (constants/services) ✓ · responsive desktop/tablet/mobile ✓.