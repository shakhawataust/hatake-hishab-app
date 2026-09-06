# Hatake Hishab - Complete Architecture & Workflow Guide

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Application Structure](#application-structure)
5. [Development Workflow](#development-workflow)
6. [Update & Deployment Process](#update--deployment-process)
7. [Key Features & Implementation](#key-features--implementation)

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.3.0 (React 19.2.8)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + PostCSS
- **State Management**: React Hooks (useState, useRef)

### Backend & Database
- **Backend**: Supabase (PostgreSQL + Cloud Functions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for receipts/documents)
- **Database**: PostgreSQL

### Deployment
- **Frontend Hosting**: Vercel
- **Database Hosting**: Supabase Cloud
- **Version Control**: Git + GitHub
- **Webhook Integration**: GitHub → Vercel (automatic deployments)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│  - Next.js React App (TypeScript)                        │
│  - Multi-language (English, Bangla, Japanese)            │
│  - Role-based UI (Admin, Accountant, Viewer)             │
└────────────────────┬────────────────────────────────────┘
                     │ API Calls (Supabase JS SDK)
                     │
┌────────────────────▼────────────────────────────────────┐
│              VERCEL (Frontend Hosting)                   │
│  - Next.js Build & Static Assets                        │
│  - Automatic deployments from GitHub                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│           SUPABASE (Backend & Database)                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database (Multi-tenant)             │   │
│  │  - Tables: transactions, farms, profiles, etc   │   │
│  │  - Row Level Security (RLS) Policies            │   │
│  │  - Constraints & Triggers                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Authentication Service                         │   │
│  │  - Supabase Auth (JWT tokens)                   │   │
│  │  - Role management (admin, accountant, etc)     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Storage (Receipts & Documents)                 │   │
│  │  - Private bucket with RLS policies             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Cloud Functions (SQL + PL/pgSQL)               │   │
│  │  - create_farm, password reset, etc             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Multi-Tenant Architecture

The app supports multiple farms, each with their own data and members:

```
┌─ Farm A ────────────────────┐
│  - Members (admin, accountant, viewer)
│  - Transactions (Sales, Expenses, Harvests)
│  - Crop Batches
│  - Inventory
│  - Orders
└─────────────────────────────┘

┌─ Farm B ────────────────────┐
│  - Members
│  - Transactions
│  - Crop Batches
│  - Data completely isolated from Farm A
└─────────────────────────────┘
```

**Data Isolation**: Row Level Security (RLS) policies ensure:
- Members can only access their farm's data
- Viewers can read but not write
- Admins can manage members

---

## Database Schema

### Core Tables

#### 1. **profiles** (User Profiles)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY (references auth.users),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. **farms** (Multi-tenant Farms)
```sql
CREATE TABLE farms (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. **farm_members** (Membership & Roles)
```sql
CREATE TABLE farm_members (
  farm_id UUID REFERENCES farms,
  user_id UUID REFERENCES profiles,
  role ENUM('admin', 'accountant', 'field_member', 'viewer'),
  investment NUMERIC,
  profit_share NUMERIC (0-100),
  PRIMARY KEY (farm_id, user_id)
);
```

#### 4. **transactions** (Main Data Table)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms,
  kind TEXT CHECK (kind IN ('sale','expense','harvest','labor')),
  occurred_on DATE NOT NULL,
  crop TEXT,                    -- Expense category or crop name
  amount NUMERIC,               -- Price/cost in ¥
  quantity NUMERIC,             -- Volume/units
  unit TEXT,                    -- kg, pcs, hours
  note TEXT,                    -- Details about transaction
  created_by UUID REFERENCES profiles,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. **crop_batches** (Crop Planning)
```sql
CREATE TABLE crop_batches (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms,
  code TEXT,
  crop TEXT,
  stage TEXT,
  planted_on DATE,
  created_by UUID REFERENCES profiles
);
```

#### 6. **inventory_items** (Stock Tracking)
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms,
  name TEXT,
  category TEXT,
  quantity NUMERIC,
  unit TEXT
);
```

#### 7. **orders** (Customer Orders)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms,
  customer_name TEXT,
  crop TEXT,
  quantity NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ
);
```

#### 8. **receipts** (Document Storage)
```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms,
  transaction_id UUID REFERENCES transactions,
  storage_path TEXT,
  uploaded_by UUID REFERENCES profiles,
  created_at TIMESTAMPTZ
);
```

#### 9. **cash_handovers** (Cash Flow Tracking)
```sql
CREATE TABLE cash_handovers (
  -- Records when cash is given from one person to another
  id UUID PRIMARY KEY,
  farm_id UUID,
  from_holder TEXT,
  to_holder TEXT,
  amount NUMERIC,
  occurred_on DATE,
  created_by UUID
);
```

#### 10. **password_resets** (Security Audit Log)
```sql
CREATE TABLE password_resets (
  -- Tracks password reset attempts for security
  id UUID PRIMARY KEY,
  farm_id UUID,
  user_id UUID,
  reset_at TIMESTAMPTZ
);
```

### Row Level Security (RLS) Policies

**Policy: "farm members access transactions"**
```sql
CREATE POLICY "farm members access transactions" 
  ON transactions 
  FOR ALL 
  USING (is_farm_member(farm_id))
  WITH CHECK (is_farm_member(farm_id));
```

This ensures:
- Users can only see/edit transactions for farms they belong to
- Viewers can read but RLS blocks their writes
- Admin controls who can access what

---

## Application Structure

### File Organization

```
hatake-hishab-app/
├── src/
│   └── app/
│       ├── page.tsx          # Main app (5800+ lines, all features)
│       ├── layout.tsx        # App layout
│       ├── globals.css       # Global styles + component classes
│       └── favicon.ico
├── supabase/
│   ├── schema.sql            # Core tables & RLS policies
│   ├── member-management.sql # Role & permission management
│   ├── crop-planner.sql      # Crop batch features
│   ├── pending-member-invites.sql
│   ├── cash-handovers.sql    # Cash flow tracking
│   ├── view-only-role.sql    # Viewer role enforcement
│   └── forgot-password.sql   # Password reset (no-email)
├── public/                   # Static assets
├── .env.example              # Environment template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind CSS config
├── deploy.sh                 # Deployment script
└── README.md                 # Setup guide
```

### Key Component Organization (in page.tsx)

```
page.tsx Structure:
├── Types & Interfaces (Line 1-100)
│   ├── Entry, ExpenseLine, SaleLine
│   ├── CropBatch, CashHandover
│   └── Farm, Language types
│
├── Component Definition (Line ~1000)
│   ├── State Management (useState/useRef)
│   │   ├── view (dashboard/expense/sales/harvest)
│   │   ├── saleLines / expenseLines (multi-line forms)
│   │   ├── entries (transaction list)
│   │   └── language (i18n)
│   │
│   ├── Async Functions
│   │   ├── loadWorkspace()    # Load all farm data
│   │   ├── saveEntry()        # Save transaction
│   │   ├── deleteEntry()      # Delete transaction
│   │   ├── startEdit()        # Load edit mode
│   │   └── saveLabor/saveHarvest/etc
│   │
│   ├── Form Rendering (Line ~3200)
│   │   ├── Date picker
│   │   ├── Sales form (multi-line)
│   │   ├── Expense form (multi-line)
│   │   ├── Labor form
│   │   └── Harvest form
│   │
│   └── Data Display
│       ├── Transaction list
│       ├── Filter panel
│       ├── Reports & dashboards
│       └── CSV export
```

---

## Development Workflow

### Step 1: Local Development

```bash
# 1. Clone repository
git clone https://github.com/shakhawataust/hatake-hishab-app.git
cd hatake-hishab-app

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env.local
# Edit .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key

# 4. Start development server
npm run dev
# Visit: http://localhost:3000

# 5. Make code changes
# - Edit src/app/page.tsx for features
# - Edit src/app/globals.css for styles
# - Changes auto-reload (HMR)
```

### Step 2: Testing Locally

```bash
# Test the feature in browser
1. Open http://localhost:3000
2. Sign in with test account
3. Navigate to the feature
4. Test all scenarios
5. Check browser DevTools Console for errors
```

### Step 3: Code Review

```bash
# Check what changed
git status
git diff src/app/page.tsx

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

---

## Update & Deployment Process

### Complete Update Workflow

#### **Phase 1: Code Changes**

```bash
# 1. Make changes to src/app/page.tsx or other files
# Example: Adding expense multi-line feature

# 2. Stage changes
git add src/app/page.tsx src/app/globals.css

# 3. Verify changes
git diff --cached

# 4. Commit with descriptive message
git commit -m "Implement multi-category expense entry

- Add ExpenseLine type definition
- Create expenseLines state management
- Update saveEntry to handle multiple expenses
- Add multi-line form UI matching sales pattern

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

#### **Phase 2: Git & GitHub**

```
Local Repository                GitHub Repository
    ↓                                  ↓
    └──── git push origin main ───────→ main branch
                                       ↓
                                  Auto-triggers Vercel webhook
```

```bash
# Push to GitHub
git push origin main

# This triggers Vercel automatically via webhook
```

#### **Phase 3: Build & Deploy (Vercel)**

```
GitHub Webhook Event
        ↓
   Vercel Received
        ↓
   Build Process
   ├─ npm install
   ├─ npm run build
   ├─ Run tests
   └─ TypeScript check
        ↓
   [SUCCESS] / [FAILURE]
        ↓
   Create Deployment
   ├─ Generate unique URL
   ├─ hatake-hishab-xxxxx.vercel.app
   └─ Show "Ready" status
        ↓
   Alias to Production
   └─ hatake-hishab-app.vercel.app ──→ Latest deployment
```

```bash
# Manual deployment (if needed)
npx vercel deploy --prod

# Check deployment status
npx vercel ls
npx vercel inspect [url]

# Alias to production
npx vercel alias set [deployment-url] hatake-hishab-app.vercel.app
```

#### **Phase 4: Database Updates (Supabase)**

```
Changes Required?
    ├─ Yes: Run SQL migrations
    │  └─ Add new tables/columns
    │     supabase/schema.sql → SQL Editor
    │
    └─ No: Data-only change (RLS policies, functions)
       └─ Changes auto-applied with code
```

**Example: Adding a new field**

```bash
# 1. Create migration SQL
# supabase/new-migration.sql

ALTER TABLE transactions ADD COLUMN new_field TEXT;

# 2. Run in Supabase SQL Editor
# 3. Test in production
# 4. Update app code if needed
```

#### **Phase 5: Frontend Live**

```
Production URL
    ↓
https://hatake-hishab-app.vercel.app
    ↓
Users Access New Feature
    ├─ Browse & interact
    ├─ Data flows through RLS policies
    └─ Real-time sync with database
```

---

## Key Features & Implementation

### 1. Sales Management

**File**: `src/app/page.tsx` (Lines ~3228-3356)

**State Management**:
```typescript
const [saleLines, setSaleLines] = useState<SaleLine[]>([
  { id: 1, crop: "", amount: "", quantity: "", unit: "" }
]);

const saleLinesTotal = saleLines.reduce(
  (total, line) => total + (Number(line.amount) || 0),
  0
);
```

**Multi-line UI**:
- Each line: crop dropdown, amount, quantity, unit
- Add button: `addSaleLine()`
- Remove button: `removeSaleLine(line.id)`
- Total calculation at bottom

**Save Flow**:
```typescript
const records = saleLines
  .filter((line) => line.crop && line.amount)
  .map((line) => ({
    kind: "sale",
    occurred_on: form.get("date"),
    crop: line.crop,
    amount: Number(line.amount),
    // ... other fields
  }));

// Insert all lines at once
await supabase.from("transactions").insert(records.map(r => ({
  ...r,
  farm_id: farm.id
})));
```

### 2. Expense Management (NEW - Multi-category)

**State Management**:
```typescript
const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
  { id: 1, category: "", amount: "", quantity: "", unit: "" }
]);
```

**Features**:
- Multiple expense items with different categories
- Each category can have different amounts
- Single "Paid by" field for all items
- Total calculation

**Form Fields**:
- Date: 2026-05-28
- Item 1: Category dropdown, Amount, Quantity, Unit
- Item 2: (Add another item button)
- Paid by: Select who paid

**Database Storage**:
```
Transaction 1: 2026-05-28, expense, "Tools", 8289
Transaction 2: 2026-05-28, expense, "Homes", 5605
```

### 3. Sales Filter Panel

**File**: Lines ~3864-3922

**Filter Criteria**:
- Crop: Exact match dropdown
- Customer: Partial match search
- Amount range: Min & Max values
- Clear button: Reset all filters

**Filter Logic** (Lines ~2041-2057):
```typescript
const displayedEntries = entries.filter((entry) => {
  if (filterCrop && entry.crop !== filterCrop) return false;
  if (filterCustomer) {
    const customerNote = entry.note?.toLowerCase() || "";
    if (!customerNote.includes(filterCustomer.toLowerCase())) return false;
  }
  if (filterMinAmount && entry.amount < Number(filterMinAmount)) return false;
  if (filterMaxAmount && entry.amount > Number(filterMaxAmount)) return false;
  return true;
});
```

### 4. Multi-Language Support

**File**: Lines ~355-450

```typescript
const translations = {
  en: {
    crop: "Crop",
    amount: "Amount (¥)",
    // ...
  },
  bn: {
    crop: "ফসল",
    amount: "পরিমাণ (¥)",
    // ...
  },
  ja: {
    crop: "作物",
    amount: "金額 (¥)",
    // ...
  }
};
```

### 5. Role-Based Access Control

**Roles**:
- **Admin**: Create/delete/manage members
- **Accountant**: Read & write transactions
- **Field Member**: Read & write transactions
- **Viewer**: Read-only (all pages)

**Enforcement**:
- Frontend: Hide/disable based on role
- Backend: RLS policies prevent writes for viewers

**Code**:
```typescript
const readOnly = farm?.role === "viewer";

// Hide save button for viewers
{!readOnly && <button>Save</button>}
```

### 6. Authentication

**Features**:
- Email/password sign up
- Forgot password (no email needed)
- Session management with JWT

**Forgot Password Flow**:
```
User enters email + new password
    ↓
Backend checks if account exists in farm
    ↓
If yes: Set password directly, sign them in
    ↓
No email sent (security note: email address alone can reset)
```

### 7. Data Loading with Pagination

**Transaction Limit**: 100,000 rows
```typescript
.limit(100000)  // Load all transactions
```

**Order**: Newest to oldest
```typescript
.order("occurred_on", { ascending: false })
```

---

## Update Example: Adding Multi-Category Expenses

### Step-by-Step Implementation

#### 1. **Type Definition** (Line ~91)
```typescript
type ExpenseLine = {
  id: number;
  category: string;
  amount: string;
  quantity: string;
  unit: string;
};
```

#### 2. **State** (Line ~1060)
```typescript
const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
  { id: 1, category: "", amount: "", quantity: "", unit: "" }
]);
const lastExpenseLineId = useRef(1);
```

#### 3. **Helper Functions** (Lines ~1096-1116)
```typescript
const blankExpenseLine = (unit = ""): ExpenseLine => ({
  id: (lastExpenseLineId.current += 1),
  category: "",
  amount: "",
  quantity: "",
  unit,
});

const addExpenseLine = () => 
  setExpenseLines((lines) => [...lines, blankExpenseLine()]);

const removeExpenseLine = (id: number) =>
  setExpenseLines((lines) =>
    lines.length > 1 ? lines.filter(line => line.id !== id) : lines
  );

const changeExpenseLine = (id: number, patch: Partial<ExpenseLine>) =>
  setExpenseLines((lines) =>
    lines.map(line => line.id === id ? { ...line, ...patch } : line)
  );
```

#### 4. **Form UI** (Lines ~3228-3356)
```typescript
{view === "expense" && (
  <div className="sale-lines full">
    {expenseLines.map((line, index) => (
      <div key={line.id}>
        <label>
          Category
          <select value={line.category} onChange={(e) =>
            changeExpenseLine(line.id, { category: e.target.value })
          }>
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
            changeExpenseLine(line.id, { amount: e.target.value })
          }
        />
        {/* more fields... */}
      </div>
    ))}
    <button onClick={addExpenseLine}>+ Add another item</button>
  </div>
)}
```

#### 5. **Save Logic** (Lines ~1464-1475)
```typescript
const records = view === "expense"
  ? expenseLines
      .filter((line) => line.category && line.amount)
      .map((line) => ({
        kind: "expense",
        occurred_on: form.get("date"),
        crop: line.category,  // category stored as crop
        amount: Number(line.amount),
        quantity: line.quantity ? Number(line.quantity) : null,
        unit: line.unit.trim() || null,
        note: note || null,
      }))
  : [...];

await supabase.from("transactions").insert(records.map(r => ({
  ...r,
  farm_id: farm.id,
  created_by: sessionData.session?.user.id
})));
```

#### 6. **Editing Support** (Lines ~2144-2162)
```typescript
const startEdit = (entry: Entry) => {
  setEditing(entry);
  
  if (entry.kind === "expense")
    setExpenseLines([{
      ...blankExpenseLine(entry.unit ?? ""),
      category: entry.crop ?? "",
      amount: entry.amount === null ? "" : String(entry.amount),
      quantity: entry.quantity === null ? "" : String(entry.quantity),
    }]);
  
  window.scrollTo({ top: 0, behavior: "smooth" });
};
```

#### 7. **Commit & Push**
```bash
git add -A
git commit -m "Implement multi-category expense entry

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
git push origin main
```

#### 8. **Vercel Auto-Deploy**
- GitHub webhook triggers
- Vercel builds project
- Tests pass
- New URL generated
- Aliased to production

---

## Performance & Scalability

### Current Limits
- **Transaction Load**: 100,000 rows per farm
- **Database**: PostgreSQL (Supabase)
- **Storage**: Up to plan limits (receipts)
- **Concurrent Users**: Unlimited (Supabase scales)

### Optimization Strategies

**1. Lazy Loading**
```typescript
// Load first 100 transactions, load more on scroll
.limit(100000)  // Currently loads all - could implement pagination
```

**2. Filtering** (Done client-side)
```typescript
const displayedEntries = entries.filter(...);  // Fast for < 10k rows
```

**3. RLS Policies**
- Database-level filtering
- Security & performance

**4. Caching** (Optional Future)
- Service Workers for offline
- Next.js Image optimization

---

## Security

### Authentication
- Supabase Auth (JWT tokens)
- Session stored in browser cookies
- Auto-refresh

### Authorization
- Row Level Security (RLS) in database
- Role-based access control
- Viewer role blocked from writes

### Data Protection
- HTTPS only
- Passwords hashed (Supabase managed)
- No sensitive data in logs
- Private storage bucket for receipts

### Password Reset
- No email (for small team farms)
- Recorded in audit table
- Only works for existing members

---

## Future Improvements

1. **Infinite Scroll** - Load transactions on demand
2. **Offline Support** - Service Workers
3. **Mobile App** - React Native version
4. **Advanced Analytics** - Charts, profit reports
5. **API** - Public API for integrations
6. **Email Notifications** - SMTP integration
7. **Advanced Permissions** - Field-level access
8. **Audit Logs** - Full transaction history

---

## Troubleshooting

### Issue: May expenses not showing
**Cause**: Transaction limit (was 100) cut off older entries
**Fix**: Increased to 100,000
```bash
npx vercel deploy --prod
```

### Issue: Expense edit form not loading
**Cause**: Missing `startEdit` handling for expense kind
**Fix**: Added `else if (entry.kind === "expense")` branch

### Issue: Paid by field required but hidden
**Cause**: Conditional rendering removed field during edit
**Fix**: Always show field, make required only for new entries

### Issue: Duplicate expenses with same date
**Cause**: Multiple form submissions
**Fix**: Add loading state to prevent double-submit

---

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL**: https://www.postgresql.org/docs
- **Vercel Deployment**: https://vercel.com/docs

---

**Last Updated**: September 6, 2026
**Version**: 0.1.0
**Maintained By**: Development Team
