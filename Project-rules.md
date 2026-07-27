# AI_PROJECT_RULES.md

# Enterprise Development Rules

> This document contains the mandatory development rules for the entire project.
>
> Every task, regardless of size, must comply with every rule in this document.
>
> No exception is allowed.
>
> A task is NOT considered complete until all mandatory verification steps in this document have been satisfied.

---

# 1. General Rules

Every implementation must be:

- Production Ready
- Enterprise Grade
- Fully Functional
- Maintainable
- Modular
- Reusable
- Scalable
- Secure
- Performant
- Accessible
- Responsive
- Configurable
- Testable

Never implement demo code.

Never implement placeholder code.

Never leave TODOs.

Never leave partially implemented features.

Never implement mock business logic.

Everything must be production quality.

---

# 2. UI Rule

The UI must never exist without business logic.

Every visible element must work.

This includes:

- Inputs
- Dropdowns
- Search
- Tables
- Cards
- Modals
- Drawers
- Buttons
- Toggles
- Tabs
- Uploads
- Calendars
- Selectors
- Grids
- Badges
- Pagination
- Filters

No static UI.

No fake buttons.

No placeholder actions.

---

# 3. Business Logic Rule

Every feature must include complete business logic.

Always implement:

- State Management
- Validation
- Calculations
- Dependencies
- Error Handling
- Loading States
- Empty States
- Permissions
- Save Logic
- Update Logic
- Delete Logic
- Restore Logic
- Undo (where applicable)

---

# 4. Shared Component Rule

Never create duplicate components.

Before creating any component always check whether a reusable component already exists.

If yes

Reuse it.

If no

Extend the shared component library.

Everything reusable should remain reusable.

Shared examples:

- Buttons
- Inputs
- Tables
- Modals
- Drawers
- Cards
- Forms
- Uploads
- Selectors
- Date Pickers
- Search
- Filters
- Toolbars
- Summary Panels

---

# 5. Database Impact Rule (MANDATORY)

Every change MUST trigger a complete database impact verification.

Never assume the database is already correct.

Always verify.

Check:

- Tables
- Columns
- Relationships
- Constraints
- Foreign Keys
- Primary Keys
- Indexes
- Triggers
- Functions
- Views
- Policies
- RLS
- Roles
- Permissions
- Buckets
- Storage
- Configuration Tables
- Lookup Tables
- Master Data
- Mapping Tables
- Translation Tables
- Seed Data

If anything is missing

Create or update it.

---

# 6. Complete Data Chain Verification

Every task must verify the complete application data flow.

UI
↓
Component
↓
Shared Component
↓
Form Engine
↓
State
↓
Validation
↓
Business Rules
↓
DTO
↓
API
↓
Service
↓
Repository
↓
Database
↓
Database Response
↓
Repository
↓
Service
↓
API
↓
Frontend State
↓
UI

Every layer must remain synchronized.

No broken mappings.

No missing objects.

---

# 7. Schema Translation Rule

Whenever a field, object, model, table, API, or property changes, verify:

- UI Field Name
- Component Property
- State Property
- Validation Schema
- DTO
- API Request
- API Response
- Database Column
- Export Model
- Import Model
- Legacy Mapping
- Translation Mapping

Maintain backward compatibility whenever required.

---

# 8. CRUD Verification

Every entity must support (where applicable):

- Create
- Read
- Update
- Delete
- Restore
- Soft Delete
- Hard Delete
- Search
- Filter
- Sort
- Pagination
- Bulk Operations

---

# 9. Validation Rule

Validation must exist at every layer.

Verify:

- UI
- Shared Validator
- API
- Service
- Database Constraint

Rules must never conflict.

---

# 10. Calculation Rule

Every calculated value must automatically update whenever dependent values change.

Never require manual refresh.

---

# 11. Regression Rule

Every change must verify existing functionality.

Always review related modules.

Never fix one feature while breaking another.

Verify:

- Existing CRUD
- Existing Search
- Existing Filters
- Existing Sorting
- Existing Forms
- Existing Calculations
- Existing Permissions
- Existing Navigation
- Existing Components

---

# 12. Missing Object Detection

Always determine whether recent application changes require creating or updating:

Database

- Tables
- Columns
- Indexes
- Views
- Functions
- Triggers
- Policies
- Constraints
- Storage
- Buckets

Application

- Components
- Hooks
- Services
- Utilities
- Types
- Interfaces
- Enums
- Constants
- Validators
- Calculators
- State
- Context
- DTOs
- APIs

Configuration

- Settings
- Master Data
- Lookup Data
- Translation Tables
- Mapping Tables
- Seed Data

Never assume they already exist.

Always verify.

---

# 13. Architecture Rule

Maintain one consistent architecture.

Never introduce:

- Duplicate Services
- Duplicate Utilities
- Duplicate Components
- Duplicate Hooks
- Duplicate APIs
- Duplicate Validation
- Duplicate Calculations
- Duplicate Business Rules

Reuse existing architecture whenever possible.

---

# 14. Performance Rule

Review performance impact for every task.

Verify:

- Rendering
- Re-renders
- Memoization
- Lazy Loading
- Code Splitting
- Query Performance
- Missing Indexes
- N+1 Queries
- Duplicate Requests

---

# 15. Security Rule

Verify:

- Authentication
- Authorization
- RLS
- Permissions
- Input Validation
- SQL Injection Protection
- XSS Protection
- File Upload Validation
- API Security

---

# 16. Documentation Rule

Whenever functionality changes update:

- Types
- Interfaces
- API Contracts
- Configuration
- Shared Components
- Database Mappings
- Architecture Documentation

Keep documentation synchronized with the implementation.

---

# 17. Completion Gate (MANDATORY)

A task is NOT complete until ALL items below are verified.

☐ Business Logic Complete

☐ UI Functional

☐ Shared Components Reused

☐ Database Verified

☐ Missing Database Objects Checked

☐ Schema Verified

☐ Mapping Verified

☐ Translation Layer Verified

☐ CRUD Verified

☐ Validation Verified

☐ Calculations Verified

☐ State Verified

☐ API Verified

☐ DTO Verified

☐ Services Verified

☐ Repository Verified

☐ Permissions Verified

☐ Security Verified

☐ Performance Verified

☐ Regression Check Passed

☐ Documentation Updated

☐ No Duplicate Code

☐ No Placeholder Code

☐ No Mock Logic

☐ No Broken Dependencies

Only after every checkpoint passes may the implementation be considered complete.

Any failed checkpoint must be resolved before marking the task as finished.


CoreX now audit and implement The implementation must follow the existing project architecture, component library, and coding standards.

Architecture Requirements (Mandatory)

Do NOT
------------
Do NOT redesign the existing architecture.
Do NOT introduce new abstraction layers.
Do NOT create new frameworks.
Do NOT create duplicate reusable components.
Do NOT place CSS inside JSX/components/pages.
Do NOT use inline SVG icons.
Provider Independence

The platform must remain provider-agnostic.

No frontend page should directly depend on:

Database providers
AI providers
Storage providers
Search providers
other providers

Frontend pages must continue communicating only through the existing respective service/data layer etc etc so on .

Reuse Existing Components

Reuse the existing shared components wherever applicable.

Modal
Card
Badge
Button
Table
Filter
Search
Pagination
Dropdown
Form Controls
Color Swatches
components 
icons

etc etc so on

Do not create duplicate versions of any of these components.

CSS Rules

Use the existing global stylesheet: - index.css

If additional styling is required:

Add all new CSS rules only to index.css.

Do not create page-specific CSS files.

Do not use inline styles unless already established by the project.

add all components in in components folders

Icon Rules
-------------------
All newly required icons must be added only to: icon.jsx

icons and savg only use lucid line icons

Do not use inline SVG.

Do not duplicate existing icons.

add RBAC features 

PermissionGate Integration

The page must be fully integrated with the application's PermissionGate module. 

Unauthorized users must:

Be prevented from accessing the page.
Never execute protected actions.
Receive the application's standard unauthorized response or page.

Component-Level PermissionGate
Wrap all sensitive UI sections with PermissionGate where appropriate
If a user lacks permission:

Hide the component when appropriate, or
Disable it according to the application's existing UX standards.

Do not expose restricted controls in the DOM unless required by the application's security model.

API Authorization

Every operation must validate permissions before execution
Server-side authorization must always be enforced, even if client-side PermissionGate is present.

Database Security

The database layer must enforce access control through the existing authorization architecture.

Where applicable:

Apply Row Level Security (RLS) policies.
Restrict CRUD operations based on user permissions.
Prevent unauthorized reads, inserts, updates, and deletes.
Ensure users can access only data they are authorized to view or modify.

PermissionGate must complement database security and must never be the only security layer.

Architecture Requirements
Reuse the existing PermissionGate implementation.
Do not create a new permission framework.
Do not duplicate authorization logic.
Do not hardcode permission names inside UI components.
Centralize permission constants and checks using the existing authorization architecture.
Keep all permission logic maintainable, reusable, and consistent across the application.

Acceptance Criteria (Additional)

The implementation is complete only when:

Every protected route is secured using PermissionGate.
Every protected UI action validates user permissions.
Unauthorized users cannot access restricted  functionality.
Authorization is enforced in both the frontend and backend.
Database access is protected using the existing security model (including RLS where applicable).
all authorization is authority/permission-based.
No hardcoded permission logic exists outside the centralized authorization system.
---------------------------------

Responsive Requirements
-------------------------------
Desktop

Full-width  workspace

Tablet

Responsive grid
Maintain logical reading order

Mobile

Stack all sections vertically
Maintain spacing and usability
Footer actions remain accessible

Functional Requirements
------------------------------
Use existing reusable components wherever available.
Preserve current project architecture.
Keep all provider access through the existing service/data layer.
Follow current validation and form handling patterns.
Maintain consistent spacing, typography, colors, and component behavior with the rest of the application.
Ensure accessibility for form controls, labels, buttons, and keyboard navigation.
Use existing global design tokens and CSS conventions. 
RLS 
white label code. 
clean code
clean way code
bug free code
no hardcoded value 
no hard-coded or dummy value