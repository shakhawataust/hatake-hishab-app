# Hatake Hishab - Quick Reference Guide

## Quick Links

- **Production App**: https://hatake-hishab-app.vercel.app/
- **GitHub Repo**: https://github.com/shakhawataust/hatake-hishab-app
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/projects

---

## Common Commands

### Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

### Git Workflow

```bash
# Check changes
git status
git diff

# Stage and commit
git add .
git commit -m "Feature description"

# Push to GitHub
git push origin main
```

### Vercel Deployment

```bash
# Deploy to preview
npx vercel deploy

# Deploy to production
npx vercel deploy --prod

# List deployments
npx vercel ls

# Check deployment status
npx vercel inspect [url]

# Alias to production
npx vercel alias set [deployment-url] hatake-hishab-app.vercel.app
```

---

## Project Structure

```
src/app/
├── page.tsx          Main app (5800+ lines)
├── layout.tsx        App layout
├── globals.css       Styles
└── favicon.ico       Icon

supabase/
├── schema.sql        Core tables
└── [feature].sql     Feature-specific SQL

public/               Static assets
.env.local            Local environment variables
package.json          Dependencies
tsconfig.json         TypeScript config
next.config.ts        Next.js config
tailwind.config.ts    Tailwind CSS config
```

---

## Key Features

### 1. Sales Management
- Multi-line form (add multiple crops at once)
- Each line: crop, amount, quantity, unit
- Total calculation
- Save as single transaction set

### 2. Expense Management  
- Multi-line form (multiple categories at once)
- Each line: category, amount, quantity, unit
- "Paid by" person tracking
- Save multiple expense records in one submit

### 3. Harvest & Labor
- Single-entry forms (one transaction per submit)
- Quantity tracking
- Labor hour tracking

### 4. Filters
- Sales filter panel
- Filter by: crop, customer, amount range
- Real-time filtering

### 5. Reports
- Full-time report
- Monthly comparison
- CSV export

### 6. Multi-Language
- English
- Bangla (Bengali)
- Japanese

### 7. Roles
- Admin: Manage members
- Accountant: Full CRUD
- Field Member: Full CRUD
- Viewer: Read-only

---

## State Management Pattern

### Multi-Line Forms (Sales/Expense)

```typescript
// State
const [lines, setLines] = useState<Line[]>([
  { id: 1, field1: "", field2: "", ... }
]);

// Helpers
const addLine = () => setLines(prev => [...prev, blankLine()]);
const removeLine = (id) => setLines(prev => 
  prev.length > 1 ? prev.filter(l => l.id !== id) : prev
);
const changeLine = (id, patch) => setLines(prev =>
  prev.map(l => l.id === id ? { ...l, ...patch } : l)
);

// Render
lines.map((line, i) => (
  <div key={line.id}>
    {/* fields */}
    <button onClick={() => removeLine(line.id)}>Remove</button>
  </div>
))

// Save
const records = lines
  .filter(l => l.field1 && l.field2)  // Validate
  .map(l => ({ ...l, farm_id, created_by }));
await supabase.from("table").insert(records);
```

---

## Database Schema at a Glance

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **profiles** | User profiles | id, display_name |
| **farms** | Multi-tenant farms | id, name, owner_id |
| **farm_members** | Members & roles | farm_id, user_id, role |
| **transactions** | Core data | kind, occurred_on, crop, amount |
| **crop_batches** | Crop planning | crop, stage, planted_on |
| **inventory_items** | Stock tracking | name, category, quantity |
| **orders** | Customer orders | customer_name, crop, quantity |
| **cash_handovers** | Cash flow | from_holder, to_holder, amount |
| **receipts** | Document storage | transaction_id, storage_path |

---

## Row Level Security (RLS)

All tables have RLS enabled:

```sql
-- Only farm members can access their farm's data
CREATE POLICY "farm members access X" ON table_name
FOR ALL USING (is_farm_member(farm_id))
WITH CHECK (is_farm_member(farm_id));
```

---

## Deployment Checklist

- [ ] All changes committed: `git status` shows clean
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Tests pass: `npm run lint`
- [ ] Code pushed: `git push origin main`
- [ ] Vercel webhook triggered (check Vercel dashboard)
- [ ] Build succeeded (status "Ready")
- [ ] Production aliased (hatake-hishab-app.vercel.app)
- [ ] Tested in production: Visit app URL
- [ ] Features working: Test key functionality

---

## Troubleshooting

### Entries not showing

**Problem**: Old entries (May, June) not displayed

**Solution**: Increase transaction limit
```typescript
// Line ~1181 in src/app/page.tsx
.limit(100000)  // Up from 100
```

### Edit form not loading

**Problem**: Clicking Edit doesn't populate form

**Solution**: Check `startEdit` function handles the entry kind
```typescript
// Line ~2144
const startEdit = (entry: Entry) => {
  if (entry.kind === "expense")
    setExpenseLines([{ ... }]);
  // Must have branch for each kind
};
```

### Submit button not working

**Problem**: Click Save but nothing happens

**Solution**: Check:
1. Browser console for errors (F12)
2. All required fields filled
3. At least 1 item with category & amount
4. User has write permission (not viewer)

### Changes not appearing in production

**Problem**: Deployed but old version still showing

**Solution**: 
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Wait 30 seconds for cache to clear
3. Check Vercel deployment status

---

## Environment Variables

### Local (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
```

### Production (Vercel Dashboard)

```
Environment → Production
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
```

---

## Performance Tips

- **Limit transactions**: Currently 100,000 (can be increased)
- **Filter client-side**: Works well for < 10k rows
- **Implement pagination**: For 100k+ rows
- **Use RLS policies**: Offload filtering to database

---

## Security Notes

1. **Authentication**: Supabase Auth (JWT tokens)
2. **Authorization**: RLS policies + role checks
3. **Passwords**: Hashed with bcrypt
4. **No email SMTP**: Passwords reset locally (security trade-off)
5. **HTTPS only**: All traffic encrypted
6. **Audit logs**: Password resets recorded

---

## Adding a New Feature

### Step 1: Type Definition
```typescript
type NewThing = {
  id: number;
  field1: string;
  field2: string;
};
```

### Step 2: State
```typescript
const [newThings, setNewThings] = useState<NewThing[]>([
  { id: 1, field1: "", field2: "" }
]);
```

### Step 3: Helpers
```typescript
const addNewThing = () => setNewThings(prev => [...prev, blank()]);
const removeNewThing = (id) => setNewThings(prev => prev.filter(x => x.id !== id));
const changeNewThing = (id, patch) => setNewThings(prev => 
  prev.map(x => x.id === id ? { ...x, ...patch } : x)
);
```

### Step 4: Form UI
```typescript
newThings.map((thing, i) => (
  <div key={thing.id}>
    <input value={thing.field1} onChange={...} />
    <input value={thing.field2} onChange={...} />
    <button onClick={() => removeNewThing(thing.id)}>Remove</button>
  </div>
))
<button onClick={addNewThing}>+ Add</button>
```

### Step 5: Save
```typescript
const records = newThings.map(t => ({ ...t, farm_id, created_by }));
await supabase.from("table").insert(records);
```

### Step 6: Commit & Deploy
```bash
git add .
git commit -m "Add new feature"
git push origin main
# Vercel deploys automatically
```

---

## Code Style

- **Indentation**: 2 spaces
- **Variables**: camelCase
- **Functions**: camelCase
- **Types**: PascalCase
- **Comments**: Only WHY, not WHAT
- **No semi-colons**: Let Prettier handle it

---

## Testing Locally

```bash
# Start dev server
npm run dev

# In browser
1. Go to http://localhost:3000
2. Sign up with email
3. Create farm
4. Add test data
5. Check browser DevTools Console (F12)
6. Check Supabase Dashboard for database entries
7. Test different roles
8. Test filters
```

---

## Git Workflow Summary

```
Make Changes
    ↓
git add .
    ↓
git commit -m "Description"
    ↓
git push origin main
    ↓
GitHub Webhook
    ↓
Vercel Build & Deploy
    ↓
Production Live (2-3 minutes)
```

---

## Useful Links

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs

---

**Last Updated**: September 6, 2026
**Version**: 0.1.0
