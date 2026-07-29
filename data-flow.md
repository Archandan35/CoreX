# Complete Application Startup, Setup Wizard, Validation & Authentication Flow

```text
                                     APPLICATION START
                                            │
                                            ▼
                              Connect to Configured Database
                                            │
                                            ▼
                          Perform Complete Live Database Validation
                                            │
                                            ▼
                      Validate Against Canonical Schema Manifest
                                            │
                                            ▼
         ┌───────────────────────────────────────────────────────────┐
         │                                                           │
         ▼                                                           ▼
 Database Empty or                                         Database Already Fully Compatible ?
 Required Objects Missing?                                    (0 Missing Objects)
 (Fresh Installation)                                                │
         │                                                           │
         │ YES                                                       │ YES
         ▼                                                           ▼
  Open Setup Wizard                                            Skip Steps 1–10
     Step 1                                                          │
         │                                                           │
         ▼                                                           │
     Step 2                                                          │
         │                                                           │
         ▼                                                           ▼
     Step 3                                               Check Administrator Authority
         │                                               (user.full_access = true)
         ▼                                                           │
     Step 4                                                          ▼
         │                                        ┌───────────────────────────────┐
         ▼                                        │                               │
     Step 5                                       ▼                               ▼
         │                              Administrator Exists?          No Administrator?
         ▼                              (full_access = true)            (0 full_access = true Authority role)
     Step 6                                       │                               │
         │                                        │ YES                           │ YES
         ▼                                        ▼                               ▼
     Step 7                                  Show Login                    Show Register
         │                                        │                               │
         ▼                                        ▼                               ▼
     Step 8                              Validate Credentials          Create Auth User
         │                                        │                               │
         ▼                                        ▼                               ▼
     Step 9                               Valid Credentials?      Create public.users Record
         │                                        │                               │
         ▼                                        ▼                               ▼
    Step 10                               Open Dashboard               Validate User Record
         │                                                                        │
         ▼                                                                        ▼
 Revalidate Complete Database                                           Email Confirmation?
         │                                                                        │
         ▼                                              ┌─────────────────────────┴─────────────────────────┐
 Database Fully Compatible?                             │                                                   │
         │                                              ▼                                                   ▼
         │ YES                                       Enabled                                             Disabled
         ▼                                              │                                                   │
 Continue Authentication                                ▼                                                   ▼
                                            Send Verification Email                                    Show Login
                                                        │                                                   │
                                                        ▼                                                   ▼
                                                User Confirms Email                                   Validate Login
                                                        │                                                   │
                                                        ▼                                                   ▼
                                                    Show Login                                        Open Dashboard
                                                        │
                                                        ▼
                                                  Validate Login
                                                        │
                                                        ▼
                                                  Open Dashboard


────────────────────────────────────────────────────────────────────────────────────────────

                         FUTURE APPLICATION STARTUP (AFTER INSTALLATION)

                            Application Start
                                    │
                                    ▼
                            Connect Database
                                    │
                                    ▼
                Perform Complete Live Database Validation
                                    │
                                    ▼
──────────────────────────────────────────────────────────────
│                                                            │
▼                                                            ▼
Database Still Fully Compatible                      Missing / Incompatible
(0 Missing Objects)                                  Objects Detected
│                                                            │
│ YES                                                        │ YES
▼                                                            ▼
Skip Steps 1–10                                   Continue Loading Application
│                                                            │
│                                                            ▼
│                                           Display Persistent Warning Banner
▼                                           (Visible ONLY to full_access = true)
Check Administrator Authority                             │
│                                                         ▼
├── full_access exists ─────► Login             "N missing or incompatible
│                                                database objects detected"
└── No full_access ─────────► Register
                                                          │
                                                          ▼
                                           User Clicks "Run Setup Wizard"
                                                          │
                                                          ▼
                                                   Open Step 1
                                                          │
                                                          ▼
                                               Complete Steps 1 → 10
                                                          │
                                                          ▼
                                           Revalidate Complete Database
                                                          │
                                                          ▼
                                           Database Fully Compatible
                                                          │
                                                          ▼
                                                     Open Step 10
                                                          │
                                                          ▼
                                             Continue Authentication
```

## Setup Wizard Steps

1. Welcome
2. Database Provider
3. Connection Details
4. Verify Connection
5. Schema Analysis
6. Installation Plan
7. Generate & Execute SQL
8. Verify Installation
9. Final Validation
10. Setup Complete


────────────────────────────────────────────────────────────────────────────────────────────

                           Banner Visibility Decision Flow




                            Application Start
                                    │
                                    ▼
                            Validate Database
                                    │
                                    ▼
                          Administrator Exists?
                        (user.full_access = true)
                                    │
                    ┌───────────────────────────┐
                    │                           │
                    ▼                           ▼
                    No                         Yes
                    │                           │
                    ▼                           ▼
Show Administrator Setup Banner         Validate Database Health
                    (All Users)                 │
                                                ▼
                                            Missing Objects?
                                                │
                                    ┌────────────────────────┐
                                    │                        │
                                    ▼                        ▼
                                    No                      Yes
                                    │                        │
                                    ▼                        ▼
                                No Banner          Show Database Health Banner
                                                (Only full_access = true Users)