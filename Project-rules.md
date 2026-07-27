# AI_PROJECT_RULES.md

# Enterprise Development Standards & Mandatory Implementation Rules

> **Purpose**
>
> This document defines the mandatory engineering, architecture, security, UI, database, and implementation standards for the entire project.
>
> Every development task—regardless of its size or complexity—must fully comply with every rule in this document.
>
> **No exceptions are permitted.**
>
> A task is considered complete **only after every mandatory verification, validation, security check, regression test, and quality gate has successfully passed.**

---

# 1. Core Development Principles

Every implementation must be:

* Production Ready
* Enterprise Grade
* Fully Functional
* Feature Complete
* Modular
* Reusable
* Extensible
* Scalable
* Maintainable
* Secure
* Performant
* Responsive
* Accessible (WCAG where applicable)
* Configurable
* Testable
* White-label Ready
* Multi-tenant Compatible (where applicable)
* Internationalization Ready
* Future-proof

Never implement:

* Demo code
* Prototype code
* Placeholder logic
* Mock business logic
* Temporary workarounds
* Incomplete features
* TODO comments
* Disabled production code
* Dead or unused code
* Hardcoded business rules
* Hardcoded permissions
* Hardcoded database identifiers
* Hardcoded API endpoints
* Hardcoded provider-specific implementations

Everything must meet production-quality standards.

---

# 2. UI Implementation Rules

A UI is never considered complete without its underlying business logic.

Every visible component must be fully functional.

This includes, but is not limited to:

* Forms
* Inputs
* Buttons
* Dropdowns
* Selectors
* Tables
* Cards
* Charts
* Dashboards
* Modals
* Drawers
* Tabs
* Accordions
* Search
* Filters
* Pagination
* Sorting
* Uploads
* Downloads
* Calendars
* Date Pickers
* Tooltips
* Context Menus
* Breadcrumbs
* Notifications
* Toasts
* Empty States
* Loading States
* Error States
* Confirmation Dialogs

The following are prohibited:

* Static UI without functionality
* Fake buttons
* Disabled features without business justification
* Placeholder actions
* Non-functional navigation
* Visual-only implementations

Every interaction must execute its intended business process.

---

# 3. Business Logic Requirements

Every feature must include complete business logic.

Mandatory implementation includes:

* State Management
* Validation
* Business Rules
* Dependency Resolution
* Calculations
* Data Synchronization
* Save
* Update
* Delete
* Restore
* Undo (where applicable)
* Conflict Resolution
* Loading Handling
* Error Handling
* Retry Logic
* Offline Handling (where applicable)
* Audit Logging
* Permission Validation
* Activity Tracking
* Event Dispatching
* Cache Synchronization

No business process may be partially implemented.

---

# 4. Shared Component Standards

Before creating any new component:

1. Search the existing shared component library.
2. Reuse an existing component whenever possible.
3. Extend shared components if additional functionality is required.
4. Create a new reusable component only when no suitable shared component exists.

Never duplicate:

* Buttons
* Cards
* Inputs
* Tables
* Forms
* Search
* Filters
* Modals
* Drawers
* Toolbars
* Pagination
* Upload Components
* Selectors
* Date Pickers
* Status Badges
* Summary Panels
* Charts
* Icons

Every reusable element belongs in the centralized components library.

---

# 5. Database Verification (Mandatory)

Every implementation must perform a complete database impact assessment.

Never assume the database already supports the requested feature.

Always verify:

* Schemas
* Tables
* Columns
* Relationships
* Primary Keys
* Foreign Keys
* Unique Constraints
* Check Constraints
* Indexes
* Views
* Materialized Views
* Functions
* Stored Procedures
* Triggers
* Sequences
* Extensions
* Policies
* Row Level Security (RLS)
* Roles
* Permissions
* Buckets
* Storage Policies
* Configuration Tables
* Lookup Tables
* Mapping Tables
* Translation Tables
* Seed Data
* Default Values

If any required object is missing:

* Create it
* Update it
* Migrate it
* Document it

Never leave schema inconsistencies.

---

# 6. End-to-End Data Flow Verification

Every feature must validate the complete data lifecycle.

```
UI
↓
Shared Component
↓
Page
↓
Form Engine
↓
Validation
↓
State Management
↓
Business Rules
↓
DTO
↓
API Layer
↓
Service Layer
↓
Repository
↓
Database
↓
Response Mapping
↓
Repository
↓
Service
↓
State
↓
UI Refresh
```

Every layer must remain synchronized.

No broken mappings.

No missing transformations.

No provider leakage.

---

# 7. Schema & Mapping Verification

Whenever any field changes, verify all dependent layers:

* UI Labels
* Component Props
* State Models
* Validation Schemas
* DTOs
* API Contracts
* Service Models
* Repository Models
* Database Columns
* Export Models
* Import Models
* Translation Models
* Legacy Compatibility
* Migration Scripts

Maintain backward compatibility whenever required.

---

# 8. CRUD Compliance

Every entity must support, where applicable:

* Create
* Read
* Update
* Delete
* Restore
* Soft Delete
* Hard Delete
* Archive
* Unarchive
* Clone
* Bulk Operations
* Search
* Filter
* Sort
* Pagination
* Export
* Import
* Audit History

---

# 9. Validation Standards

Validation must exist consistently across:

* UI
* Shared Validators
* Forms
* API
* Services
* Database Constraints

Validation rules must never conflict.

---

# 10. Automatic Calculations

All calculated values must update automatically.

No manual refresh.

No stale calculations.

No duplicated calculation logic.

---

# 11. Regression Verification

Every implementation must verify:

* Existing CRUD
* Existing Forms
* Existing Navigation
* Existing Components
* Existing APIs
* Existing Permissions
* Existing Search
* Existing Filters
* Existing Sorting
* Existing Reports
* Existing Exports
* Existing Imports

No regression is acceptable.

---

# 12. Missing Object Detection

Always determine whether implementation requires updates to:

### Database

* Tables
* Columns
* Views
* Functions
* Policies
* Triggers
* Buckets
* Storage
* Indexes
* Constraints

### Application

* Components
* Hooks
* Services
* Repositories
* DTOs
* APIs
* Utilities
* Constants
* Types
* Interfaces
* Validators
* Calculators
* Context
* Events

### Configuration

* Settings
* Master Data
* Translation Tables
* Seed Data
* Lookup Data

Never assume anything already exists.

---

# 13. Architecture Rules

Maintain the existing project architecture.

Do NOT introduce:

* Duplicate Services
* Duplicate Hooks
* Duplicate Utilities
* Duplicate Components
* Duplicate APIs
* Duplicate Validation
* Duplicate Business Rules
* Duplicate Calculations

Always reuse existing architecture.

---

# 14. Provider Independence

The application must remain provider-agnostic.

Pages and components must never directly communicate with:

* Database Providers
* AI Providers
* Storage Providers
* Authentication Providers
* Search Providers
* Analytics Providers

All communication must go through the established service/data layer.

---

# 15. CSS & Styling Standards

* Use only the existing global stylesheet (`index.css`).
* Do not create page-specific stylesheets.
* Do not use inline styles unless already established.
* Reuse existing design tokens.
* Follow the application's spacing, typography, color, and layout standards.
* Ensure responsive behavior for desktop, tablet, and mobile.

---

# 16. Icon Standards

* Use only centralized icons.
* Add new icons only to `icon.jsx`.
* Use Lucide line icons.
* Never embed inline SVG.
* Never duplicate icons.

---

# 17. Security Standards

Every implementation must verify:

* Authentication
* Authorization
* RBAC
* PermissionGate
* API Authorization
* RLS Policies
* SQL Injection Protection
* XSS Protection
* CSRF Protection (where applicable)
* File Upload Validation
* Input Sanitization
* Output Encoding
* Secure Defaults

Frontend security complements backend enforcement and never replaces it.

---

# 18. Permission & RBAC Standards

All authorization must be permission-based.

Requirements:

* Integrate with the existing PermissionGate.
* Protect routes.
* Protect components.
* Protect API endpoints.
* Protect database operations.
* Hide or disable unauthorized controls.
* Never hardcode permissions.
* Centralize permission definitions.
* Enforce authorization at every layer.

---

# 19. Performance Standards

Review:

* Rendering Performance
* Memoization
* Lazy Loading
* Code Splitting
* Query Optimization
* Missing Indexes
* N+1 Queries
* Duplicate Requests
* Bundle Size
* Memory Usage

Every implementation should maintain or improve performance.

---

# 20. Documentation Standards

Whenever functionality changes, update:

* Types
* Interfaces
* API Contracts
* Database Mappings
* Architecture Documentation
* Configuration
* Shared Components
* Developer Documentation

Documentation must remain synchronized with implementation.

---

# 21. Completion Gate (Mandatory)

A task is complete only after all checkpoints pass.

* Business Logic Complete
* UI Fully Functional
* Shared Components Reused
* Architecture Preserved
* Provider Independence Maintained
* Database Verified
* Missing Objects Verified
* Schema Verified
* Mappings Verified
* CRUD Complete
* Validation Complete
* State Verified
* API Verified
* DTO Verified
* Services Verified
* Repository Verified
* PermissionGate Integrated
* RBAC Verified
* RLS Verified
* Security Verified
* Performance Reviewed
* Accessibility Verified
* Responsive Verification Passed
* Regression Tests Passed
* Documentation Updated
* No Duplicate Code
* No Placeholder Code
* No Mock Logic
* No Dead Code
* No Broken Dependencies
* Production Ready

**Only after every checkpoint has successfully passed may the implementation be considered complete.**

**Any failed checkpoint must be resolved before the task is marked as finished.**
