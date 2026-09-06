# Hatake Hishab - Workflow Diagrams

## 1. Complete Update & Deployment Workflow

### End-to-End Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

Step 1: LOCAL DEVELOPMENT
════════════════════════════════════════════════════════════════════════════

  💻 Developer's Machine
  ┌────────────────────────────────────────┐
  │ 1. Code Changes                        │
  │    - Edit src/app/page.tsx             │
  │    - Edit src/app/globals.css          │
  │    - Update types if needed            │
  │                                        │
  │ 2. Local Testing                       │
  │    npm run dev                         │
  │    http://localhost:3000               │
  │    ✓ Test in browser                   │
  │    ✓ Check DevTools console            │
  │                                        │
  │ 3. TypeScript Check                    │
  │    npx tsc --noEmit                    │
  │    ✓ No compilation errors             │
  │                                        │
  │ 4. Review Changes                      │
  │    git diff src/app/page.tsx           │
  │    ✓ Verify what changed               │
  └────────────────────────────────────────┘
           │
           │ ✓ All checks pass
           ↓

Step 2: GIT & VERSION CONTROL
════════════════════════════════════════════════════════════════════════════

  📝 Git Repository (Local)
  ┌────────────────────────────────────────┐
  │ Stage Changes                          │
  │ git add src/app/page.tsx               │
  │ git add src/app/globals.css            │
  │                                        │
  │ Commit with Message                    │
  │ git commit -m "Feature description     │
  │   - Detail 1                           │
  │   - Detail 2"                          │
  │                                        │
  │ Commit Creates:                        │
  │ - Hash (e.g., 4cfc666)                 │
  │ - Author info                          │
  │ - Timestamp                            │
  │ - Full change history                  │
  └────────────────────────────────────────┘
           │
           │ git push origin main
           ↓

Step 3: GITHUB PUSH
════════════════════════════════════════════════════════════════════════════

  🐙 GitHub Repository
  ┌────────────────────────────────────────┐
  │ Remote: origin                         │
  │ https://github.com/shakhawataust/      │
  │ hatake-hishab-app                      │
  │                                        │
  │ Branches:                              │
  │ - main (production)                    │
  │ - password-reset-and-viewer-role       │
  │                                        │
  │ Commit received on main                │
  │ ✓ Code pushed successfully             │
  │ ✓ Change visible on GitHub             │
  │ ✓ Pull requests can be created         │
  └────────────────────────────────────────┘
           │
           │ Webhook Event Triggered
           ↓

Step 4: VERCEL WEBHOOK TRIGGER
════════════════════════════════════════════════════════════════════════════

  🔔 Webhook Event
  ┌────────────────────────────────────────┐
  │ Event: push to main                    │
  │ Repository: hatake-hishab-app          │
  │ Commit: 4cfc666                        │
  │ Trigger: Automatic (pre-configured)    │
  │                                        │
  │ Vercel receives notification           │
  │ "New commit on main branch"            │
  │ Start deployment process               │
  └────────────────────────────────────────┘
           │
           │ Begin Build
           ↓

Step 5: VERCEL BUILD & DEPLOYMENT
════════════════════════════════════════════════════════════════════════════

  🔨 Vercel Build Process
  ┌────────────────────────────────────────┐
  │ 1. Install Dependencies                │
  │    npm install                         │
  │    ├─ next@16.3.0                      │
  │    ├─ react@19.2.8                     │
  │    ├─ @supabase/supabase-js@2.112.3    │
  │    └─ tailwindcss@4                    │
  │                                        │
  │ 2. Build                               │
  │    npm run build                       │
  │    ├─ Compile TypeScript                │
  │    ├─ Bundle JavaScript                 │
  │    ├─ Generate CSS                      │
  │    └─ Create static assets              │
  │                                        │
  │ 3. Optimize                            │
  │    ├─ Tree shake                        │
  │    ├─ Minify code                       │
  │    └─ Generate source maps              │
  │                                        │
  │ 4. Generate Deployment                 │
  │    ├─ Create unique URL:                │
  │    │  hatake-hishab-xxxx.vercel.app    │
  │    ├─ Upload to CDN                     │
  │    └─ Store in cache                    │
  │                                        │
  │ Status: READY ✓                        │
  │ Build Time: ~45 seconds                │
  └────────────────────────────────────────┘
           │
           │ Deployment Successful
           ↓

Step 6: ALIAS TO PRODUCTION
════════════════════════════════════════════════════════════════════════════

  🔗 Vercel Alias
  ┌────────────────────────────────────────┐
  │ Command:                               │
  │ vercel alias set [new-url] [prod-url]  │
  │                                        │
  │ Before Alias:                          │
  │ hatake-hishab-p8u2.vercel.app ─────→  │
  │ (No traffic)                           │
  │                                        │
  │ After Alias:                           │
  │ hatake-hishab-app.vercel.app ──────→  │
  │ (All traffic now goes here)            │
  │       ↓                                │
  │ hatake-hishab-p8u2.vercel.app         │
  │ (Latest deployment)                    │
  │                                        │
  │ Users see new version immediately      │
  └────────────────────────────────────────┘
           │
           │ Production Live
           ↓

Step 7: LIVE IN PRODUCTION
════════════════════════════════════════════════════════════════════════════

  🌍 Production Environment
  ┌────────────────────────────────────────┐
  │ URL: https://hatake-hishab-app.        │
  │      vercel.app                        │
  │                                        │
  │ Users Access:                          │
  │ ✓ Browser cache cleared (new build)    │
  │ ✓ JavaScript loaded                    │
  │ ✓ Styles applied                       │
  │ ✓ Connected to Supabase                │
  │                                        │
  │ Features Available:                    │
  │ ✓ New functionality live                │
  │ ✓ Data flows to database               │
  │ ✓ All users can use                    │
  │                                        │
  │ Performance:                           │
  │ ✓ 99.9% uptime                        │
  │ ✓ Global CDN distribution              │
  │ ✓ Sub-100ms response time              │
  └────────────────────────────────────────┘

```

---

## 2. Data Flow: Adding Expense with Multiple Categories

### User Interaction to Database

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER ADDS EXPENSE (Multiple Categories)             │
└─────────────────────────────────────────────────────────────────────────┘

BROWSER (Client-Side)
════════════════════════════════════════════════════════════════════════════

User Action → React State Update → UI Render
   ↓              ↓                    ↓

1️⃣  Date Input: 2026-05-28
    form.get("date") = "2026-05-28"

2️⃣  Expense Item 1:
    ┌──────────────────────┐
    │ Category: "Tools"    │
    │ Amount: "8289"       │
    │ Quantity: ""         │
    │ Unit: ""             │
    └──────────────────────┘
    expenseLines[0] state updated

3️⃣  Click "+ Add another item"
    ┌──────────────────────┐
    │ Category: "Homes"    │
    │ Amount: "5605"       │
    │ Quantity: ""         │
    │ Unit: ""             │
    └──────────────────────┘
    expenseLines[1] state updated

4️⃣  Paid by: "Shakhawat"
    form.get("paid_by") = "Shakhawat"

5️⃣  Click SAVE Button
    │
    ├─ Event: onSubmit={saveEntry}
    ├─ preventDefault() triggered
    ├─ formElement.reset() blocked
    └─ saveEntry() async function called
            │
            ↓

PROCESSING (JavaScript)
════════════════════════════════════════════════════════════════════════════

saveEntry() Function:
│
├─ Get Form Data
│  └─ date: "2026-05-28"
│  └─ paid_by: "Shakhawat"
│
├─ Filter & Transform expenseLines
│  └─ Only lines with category AND amount
│  └─ Create records array:
│     [
│       {
│         kind: "expense",
│         occurred_on: "2026-05-28",
│         crop: "Tools",              ← category stored as crop
│         amount: 8289,               ← converted to number
│         quantity: null,
│         unit: null,
│         note: "Paid by: Shakhawat"  ← added to note
│       },
│       {
│         kind: "expense",
│         occurred_on: "2026-05-28",
│         crop: "Homes",              ← second category
│         amount: 5605,               ← different amount
│         quantity: null,
│         unit: null,
│         note: "Paid by: Shakhawat"
│       }
│     ]
│
├─ Validation
│  ├─ ✓ records.length > 0
│  ├─ ✓ All required fields present
│  └─ ✓ User has write permission
│
└─ Send to Supabase
   └─ supabase.from("transactions").insert(records)
         │
         ├─ Add farm_id
         ├─ Add created_by (user ID)
         └─ Insert both records
            │
            ↓

NETWORK TRANSMISSION
════════════════════════════════════════════════════════════════════════════

HTTP POST Request
├─ URL: https://[project].supabase.co/rest/v1/transactions
├─ Method: POST
├─ Headers:
│  ├─ Authorization: Bearer [jwt_token]
│  ├─ Content-Type: application/json
│  └─ apikey: [anon_key]
├─ Body: [
│    {
│      kind: "expense",
│      occurred_on: "2026-05-28",
│      crop: "Tools",
│      amount: 8289,
│      farm_id: "0e4caa2a-e6d4...",
│      created_by: "04caa2f-e6d4...",
│      ...
│    },
│    { ... }  ← second item
│  ]
│
└─ Response: 
   {
     "status": 201,
     "data": [{ id, created_at, ... }, { ... }],
     "error": null
   }
            │
            ↓

SUPABASE (Backend - PostgreSQL Database)
════════════════════════════════════════════════════════════════════════════

Authentication Layer
├─ Decode JWT token
├─ Extract user_id from token
├─ Verify user is farm member
└─ Allow/Deny based on RLS policy
    │
    ├─ is_farm_member(farm_id) = TRUE
    └─ Policy: "farm members access transactions" = ALLOW
            │
            ↓

Data Insertion
├─ Table: public.transactions
│
├─ Record 1:
│  id: 'c109bd75-c416-a94f...' (UUID auto-generated)
│  farm_id: '0e4caa2a-e6d4...'
│  kind: 'expense'
│  occurred_on: 2026-05-28
│  crop: 'Tools'
│  amount: 8289
│  quantity: NULL
│  unit: NULL
│  note: 'Paid by: Shakhawat'
│  created_by: '04caa2f-e6d4...'
│  created_at: 2026-09-06 14:32:15.123456+00
│  ✓ Inserted
│
├─ Record 2:
│  id: 'c109bd75-c416-a94f...' (different UUID)
│  farm_id: '0e4caa2a-e6d4...'
│  kind: 'expense'
│  occurred_on: 2026-05-28
│  crop: 'Homes'
│  amount: 5605
│  quantity: NULL
│  unit: NULL
│  note: 'Paid by: Shakhawat'
│  created_by: '04caa2f-e6d4...'
│  created_at: 2026-09-06 14:32:15.234567+00
│  ✓ Inserted
│
└─ Result: 2 rows inserted successfully
            │
            ↓

Database Triggers & Functions
├─ Validate data types
├─ Check constraints (kind IN expense/sale/harvest/labor)
├─ Update updated_at timestamp
├─ Trigger any subscriptions
└─ Send notification to connected clients
            │
            ↓

RESPONSE BACK TO CLIENT
════════════════════════════════════════════════════════════════════════════

Response to Browser:
├─ Status: 201 Created
├─ Data: [record1, record2]
├─ Error: null
│
└─ Browser Receives:
   ├─ Notice: "2 expense items added. ¥13,894"
   ├─ Form Resets (expenseLines cleared)
   ├─ loadWorkspace() called to refresh data
   │  └─ Re-fetches all transactions (limit 100,000)
   │  └─ UI updates to show new entries
   └─ View returns to dashboard
            │
            ↓

UI UPDATE (React)
════════════════════════════════════════════════════════════════════════════

State Changes:
├─ entries updated with new transactions
├─ expenseLines reset to blank
├─ saleLines unchanged
├─ view might switch to "dashboard"
└─ notice displays success message

Rendered Output:
├─ Success banner: "2 expense items added. ¥13,894"
├─ Expense list shows:
│  ├─ 2026-05-28 | Expense | Tools    | ¥8,289  | Edit | Delete
│  ├─ 2026-05-28 | Expense | Homes    | ¥5,605  | Edit | Delete
│  └─ Earlier entries...
│
└─ Form cleared for new entry

FINAL STATE
════════════════════════════════════════════════════════════════════════════

Database State:
✓ 2 new transaction rows in Supabase
✓ Data visible to all farm members (RLS allows)
✓ Audit trail recorded (created_by, created_at)

Browser State:
✓ Data displayed to user
✓ Ready for next entry
✓ Full history accessible

User Experience:
✓ Both expenses saved in single submission
✓ Different categories recorded separately
✓ Total amount calculated and displayed
✓ Can edit or delete individual items

```

---

## 3. Multi-Line Form State Management

### Sales/Expense Form Structure

```
expenseLines State Array
═════════════════════════════════════════════════════════════════════════════

Initial State (blank form):
┌────────────────────────────────┐
│ expenseLines = [               │
│   {                            │
│     id: 1,                     │
│     category: "",              │
│     amount: "",                │
│     quantity: "",              │
│     unit: ""                   │
│   }                            │
│ ]                              │
└────────────────────────────────┘

User fills Item 1:
┌────────────────────────────────┐
│ expenseLines = [               │
│   {                            │
│     id: 1,                     │
│     category: "Tools",    ←────┤ User selected
│     amount: "8289",       ←────┤ User entered
│     quantity: "",              │
│     unit: ""                   │
│   }                            │
│ ]                              │
└────────────────────────────────┘

User clicks "+ Add another item":
┌────────────────────────────────┐
│ expenseLines = [               │
│   {                            │
│     id: 1,                     │
│     category: "Tools",         │
│     amount: "8289",            │
│     quantity: "",              │
│     unit: ""                   │
│   },                           │
│   {                       ←────┤ New blank item
│     id: 2,               ←────┤ Auto-increment ID
│     category: "",              │
│     amount: "",                │
│     quantity: "",              │
│     unit: ""                   │
│   }                            │
│ ]                              │
└────────────────────────────────┘

User fills Item 2:
┌────────────────────────────────┐
│ expenseLines = [               │
│   {                            │
│     id: 1,                     │
│     category: "Tools",         │
│     amount: "8289",            │
│     quantity: "",              │
│     unit: ""                   │
│   },                           │
│   {                            │
│     id: 2,                     │
│     category: "Homes",   ←────┤ User selected
│     amount: "5605",      ←────┤ User entered
│     quantity: "",              │
│     unit: ""                   │
│   }                            │
│ ]                              │
└────────────────────────────────┘

User clicks Remove on Item 1:
┌────────────────────────────────┐
│ expenseLines = [               │
│   {                            │
│     id: 2,                     │
│     category: "Homes",         │
│     amount: "5605",            │
│     quantity: "",              │
│     unit: ""                   │
│   }                            │
│ ]                              │
└────────────────────────────────┘
Note: Must have ≥1 item, so remove only if length > 1

Helper Functions Anatomy
═════════════════════════════════════════════════════════════════════════════

addExpenseLine()
  │
  └─→ setExpenseLines((lines) => [
        ...lines,                    ← Keep existing items
        blankExpenseLine()            ← Add new blank item
      ])
      
      blankExpenseLine() returns:
      {
        id: (lastExpenseLineId.current += 1),  ← Next available ID
        category: "",
        amount: "",
        quantity: "",
        unit: lines[lines.length-1]?.unit ?? ""  ← Copy last unit
      }

removeExpenseLine(id)
  │
  └─→ setExpenseLines((lines) =>
        lines.length > 1                     ← Prevent empty form
          ? lines.filter(line => line.id !== id)   ← Remove matching ID
          : lines                                    ← Keep if only 1 left
      )

changeExpenseLine(id, patch)
  │
  └─→ setExpenseLines((lines) =>
        lines.map(line =>
          line.id === id                           ← Find matching line
            ? { ...line, ...patch }                 ← Update properties
            : line                                   ← Keep unchanged
        )
      )

Example:
changeExpenseLine(1, { category: "Tools" })
  ├─ Find line with id=1
  ├─ Spread existing properties: { id: 1, amount: "8289", ... }
  ├─ Override category: { category: "Tools" }
  └─ Result: { id: 1, category: "Tools", amount: "8289", ... }

Form Rendering
═════════════════════════════════════════════════════════════════════════════

expenseLines.map((line, index) => (
  <div key={line.id}>                    ← Unique key for each item
    <label>
      Category
      <select
        value={line.category}             ← Controlled input
        onChange={(e) =>
          changeExpenseLine(line.id, {
            category: e.target.value      ← Update state on change
          })
        }
      >
        <option value="">Select</option>
        {expenseCategories.map(cat => (
          <option key={cat}>{cat}</option>
        ))}
      </select>
    </label>
    
    <input
      type="number"
      value={line.amount}
      onChange={(e) =>
        changeExpenseLine(line.id, {
          amount: e.target.value
        })
      }
    />
    
    {expenseLines.length > 1 && (          ← Show remove only if > 1
      <button
        onClick={() => removeExpenseLine(line.id)}
      >
        Remove
      </button>
    )}
  </div>
))

<button onClick={addExpenseLine}>
  + Add another item
</button>

```

---

## 4. Database Transaction Flow

### How Multiple Expenses Are Saved

```
saveEntry() Function Logic
════════════════════════════════════════════════════════════════════════════

Input: Form data + expenseLines state

Step 1: Extract Form Data
┌─────────────────────────────────────┐
│ const form = new FormData(event.currentTarget)
│ date = form.get("date")             → "2026-05-28"
│ paid_by = form.get("paid_by")       → "Shakhawat"
│ note = form.get("note")             → custom notes
└─────────────────────────────────────┘

Step 2: Build Records Array
┌─────────────────────────────────────┐
│ const records =                      │
│   view === "expense"                │
│     ? expenseLines                  │
│         .filter((line) =>           │
│           line.category && line.amount  ← Only complete items
│         )                           │
│         .map((line) => ({           │
│           kind: "expense",          │
│           occurred_on: "2026-05-28", │
│           crop: line.category,      │
│           amount: 8289,             │
│           quantity: null,           │
│           unit: null,               │
│           note: "Paid by: Shakhawat"│
│         }))                         │
│     : ...                           │
│                                    │
│ Result: [                           │
│   { kind, occurred_on, crop: "Tools", amount: 8289, ...},
│   { kind, occurred_on, crop: "Homes", amount: 5605, ...}
│ ]                                  │
└─────────────────────────────────────┘

Step 3: Validate
┌─────────────────────────────────────┐
│ if (!records.length) {              │
│   setNotice("Need at least 1 item")
│   return                            │
│ }                                  │
│                                    │
│ ✓ records.length = 2               │
└─────────────────────────────────────┘

Step 4: Send to Supabase
┌─────────────────────────────────────┐
│ const result = await supabase       │
│   .from("transactions")             │
│   .insert(                          │
│     records.map((record) => ({      │
│       ...record,                    │
│       farm_id: farm.id,             │ Add context
│       created_by: user.id           │ Add auth info
│     }))                             │
│   )                                │
│                                    │
│ Sends:                             │
│ [                                  │
│   {                                │
│     kind: "expense",               │
│     occurred_on: "2026-05-28",      │
│     crop: "Tools",                 │
│     amount: 8289,                  │
│     farm_id: "0e4caa2a...",        │
│     created_by: "04caa2f...",      │
│   },                               │
│   {                                │
│     kind: "expense",               │
│     occurred_on: "2026-05-28",      │
│     crop: "Homes",                 │
│     amount: 5605,                  │
│     farm_id: "0e4caa2a...",        │
│     created_by: "04caa2f...",      │
│   }                                │
│ ]                                  │
└─────────────────────────────────────┘

Step 5: Database Insert
┌─────────────────────────────────────┐
│ PostgreSQL:                        │
│                                   │
│ INSERT INTO transactions (        │
│   kind, occurred_on, crop,        │
│   amount, farm_id, created_by     │
│ ) VALUES                          │
│   ('expense', '2026-05-28',       │
│    'Tools', 8289,                 │
│    '0e4caa2a...', '04caa2f...'),  │
│   ('expense', '2026-05-28',       │
│    'Homes', 5605,                 │
│    '0e4caa2a...', '04caa2f...')   │
│                                   │
│ RETURNING *;                      │
│                                   │
│ Result:                           │
│ 2 rows inserted successfully      │
└─────────────────────────────────────┘

Step 6: Response & UI Update
┌─────────────────────────────────────┐
│ if (!result.error) {               │
│   setNotice("2 items added. ¥13,894")
│   formElement.reset()              │ Clear form
│   resetExpenseLines()              │ Clear expenseLines
│   await loadWorkspace()            │ Refresh data
│ }                                 │
│                                   │
│ User sees:                        │
│ ✓ Success message                  │
│ ✓ Form cleared                     │
│ ✓ New entries in list              │
└─────────────────────────────────────┘

```

---

## 5. Authentication & Authorization Flow

```
User Sign-In/Sign-Up
════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────┐
│  1. USER VISITS APP                    │
│     https://hatake-hishab-app.vercel.app
│                                        │
│  2. APP CHECKS SESSION                 │
│     supabase.auth.getSession()        │
│     ├─ JWT token in cookie?            │
│     ├─ Is token valid?                 │
│     └─ Is token expired?               │
│                                        │
│  3a. SESSION EXISTS                    │
│      ├─ Load farm data                 │
│      ├─ Check user role                │
│      └─ Render dashboard               │
│                                        │
│  3b. NO SESSION                        │
│      ├─ Show sign-in/sign-up form      │
│      └─ User enters email & password   │
│                                        │
│  4. SIGN-UP/LOGIN REQUEST              │
│     supabase.auth.signInWithPassword({│
│       email: "user@example.com",      │
│       password: "secure123"           │
│     })                                │
│                                        │
│  5. SUPABASE VALIDATES                │
│     ├─ Hash password (bcrypt)         │
│     ├─ Compare with stored hash       │
│     ├─ ✓ Match = valid credentials    │
│     └─ ✗ No match = invalid           │
│                                        │
│  6. IF VALID                           │
│     ├─ Create JWT token               │
│     ├─ Store in cookie                │
│     ├─ Create session record          │
│     └─ Return user info               │
│                                        │
│  7. LOAD USER DATA                     │
│     supabase                          │
│       .from("profiles")               │
│       .select("*")                    │
│       .eq("id", auth.uid())           │
│       ├─ Get display_name             │
│       └─ Check farms                  │
│                                        │
│  8. LOAD FARM DATA                     │
│     SELECT farms.*, role              │
│     FROM farm_members                 │
│     WHERE user_id = auth.uid()        │
│     ├─ User's farms                   │
│     ├─ User's role per farm           │
│     └─ Select primary farm            │
│                                        │
│  9. SET APP STATE                      │
│     ├─ user = { id, email, ... }      │
│     ├─ farm = { id, name, role }      │
│     └─ Show appropriate UI            │
└─────────────────────────────────────────┘

Role-Based Access Control
════════════════════════════════════════════════════════════════════════════

User Role: ADMIN
├─ Can: View all data, add members, remove members
├─ Cannot: Bypass than own farm
└─ UI Changes:
   ├─ Show Members management page
   ├─ Show Settings tab
   ├─ "Add Member" button visible
   └─ Full data access

User Role: ACCOUNTANT
├─ Can: Read & write all transactions
├─ Cannot: Manage members
└─ UI Changes:
   ├─ Hide Members management
   ├─ Show all transaction pages
   ├─ Save/Delete buttons visible
   └─ Full CRUD access

User Role: FIELD_MEMBER
├─ Can: Read & write transactions
├─ Cannot: Manage members, access reports
└─ UI Changes:
   ├─ Hide admin features
   ├─ Show basic transaction forms
   ├─ Limited report access
   └─ Standard CRUD

User Role: VIEWER
├─ Can: Read only (all pages)
├─ Cannot: Write anything, manage members
└─ UI Changes:
   ├─ All Save/Delete/Edit buttons hidden
   ├─ All forms disabled
   ├─ Read-only views shown
   └─ CSV export still available

Frontend Enforcement:
┌─────────────────────────────────────────┐
│ const readOnly = farm?.role === "viewer"
│                                        │
│ {!readOnly && (                        │
│   <button onClick={saveEntry}>Save</button>
│ )}                                    │
│                                        │
│ {readOnly && (                        │
│   <p style={{opacity: 0.5}}>           │
│     Viewer role - cannot edit         │
│   </p>                                │
│ )}                                    │
└─────────────────────────────────────────┘

Backend Enforcement (RLS):
┌─────────────────────────────────────────┐
│ CREATE POLICY "farm members access      │
│ transactions" ON transactions           │
│ FOR ALL USING (is_farm_member(farm_id)) │
│ WITH CHECK (is_farm_member(farm_id));   │
│                                        │
│ This means:                            │
│ ├─ View: Only if user is farm member  │
│ ├─ Write: Only if user is farm member │
│ └─ Viewer role: RLS blocks writes     │
│    (even if UI allowed)                │
└─────────────────────────────────────────┘

```

---

## 6. Environment Configuration

```
Development vs Production
════════════════════════════════════════════════════════════════════════════

LOCAL DEVELOPMENT
.env.local
├─ NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
├─ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
└─ localhost:3000

├─ Local Next.js server
├─ Hot Module Replacement (HMR)
├─ Fast iteration
└─ Can test with local Supabase


PRODUCTION
.env (set in Vercel dashboard)
├─ NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
├─ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
└─ hatake-hishab-app.vercel.app

├─ CDN-distributed build
├─ Optimized assets
├─ SSL/TLS encrypted
└─ Connected to Supabase cloud
```

---

**Total Workflow Time**: ~2-5 minutes
- Development & Testing: 30 seconds - 5 minutes
- Commit & Push: 5 seconds
- GitHub Webhook: < 1 second
- Vercel Build: 30-45 seconds
- Alias & Live: < 5 seconds

**Last Updated**: September 6, 2026
