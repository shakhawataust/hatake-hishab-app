# Customer Bill Feature - Implementation Guide

## Overview

This guide explains how to add customer invoice/bill generation to the Hatake Hishab app.

## Database Setup

### Step 1: Create Bill Tables

Run the SQL in `supabase/bills.sql` in your Supabase SQL Editor:

```bash
# Login to Supabase Dashboard
# Go to: SQL Editor
# Paste contents of supabase/bills.sql
# Click "Run"
```

**Tables Created:**
- `bills` - Main invoice records
- `bill_items` - Line items in each bill
- `bill_payments` - Payment tracking

**Features:**
- Auto-generated bill numbers (YYYY-####)
- Status tracking (draft, issued, sent, paid, overdue)
- Payment amount auto-calculated
- RLS policies for security
- Performance indexes

### Step 2: Verify Tables

```sql
-- In Supabase SQL Editor, verify:
SELECT * FROM public.bills LIMIT 1;
SELECT * FROM public.bill_items LIMIT 1;
SELECT * FROM public.bill_payments LIMIT 1;
```

## Code Implementation

### Step 1: Add Type Definitions

Add to `src/app/page.tsx` around line 100:

```typescript
// Bill types
type Bill = {
  id: string;
  farm_id: string;
  bill_number: string;
  customer_name: string;
  bill_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue';
  notes: string | null;
  created_by: string;
  created_at: string;
};

type BillItem = {
  id: string;
  bill_id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  amount: number;
};

type BillPayment = {
  id: string;
  bill_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  recorded_by: string;
};
```

### Step 2: Add State Management

Add to state declarations (around line 1060):

```typescript
// Bills
const [bills, setBills] = useState<Bill[]>([]);
const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
const [billItems, setBillItems] = useState<BillItem[]>([]);
const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
```

### Step 3: Load Bills Data

Update `loadWorkspace()` function to include bills (around line 1175):

```typescript
// In the Promise.all array, add:
supabase
  .from("bills")
  .select("*")
  .eq("farm_id", selected.id)
  .order("bill_date", { ascending: false }),
```

Then add to array destructuring:

```typescript
const [
  transactionData,
  batchData,
  inventoryData,
  orderData,
  taskData,
  handoverData,
  billData,  // Add this
  // ... rest
] = await Promise.all([
  // ... existing queries
  billQuery  // Add this
]);

// Later in loadWorkspace:
setBills(billData.data ?? []);
```

### Step 4: Add Bill Functions

Add these functions after `saveEntry()`:

```typescript
// Generate bill from sales
async function generateBillFromSales(
  customerId: string,
  startDate: string,
  endDate: string
) {
  if (!supabase || !farm) return;
  
  // Get sales for this customer
  const { data: sales } = await supabase
    .from("transactions")
    .select("*")
    .eq("farm_id", farm.id)
    .eq("kind", "sale")
    .gte("occurred_on", startDate)
    .lte("occurred_on", endDate)
    .filter("note", "ilike", `%${customerId}%`);

  if (!sales || !sales.length) {
    setNotice("No sales found for this customer in date range");
    return;
  }

  // Calculate total
  const totalAmount = sales.reduce((sum, s) => sum + (s.amount || 0), 0);

  // Create bill
  const { data: sessionData } = await supabase.auth.getSession();
  const result = await supabase.from("bills").insert({
    farm_id: farm.id,
    bill_number: `BILL-${Date.now()}`, // Will use auto-generate later
    customer_name: customerId,
    bill_date: new Date().toISOString().split('T')[0],
    total_amount: totalAmount,
    status: "draft",
    created_by: sessionData.session?.user.id,
  });

  if (!result.error && result.data) {
    const billId = result.data[0].id;

    // Add bill items
    const items = sales.map((sale) => ({
      bill_id: billId,
      description: sale.crop || "Item",
      quantity: sale.quantity || 1,
      unit: sale.unit || "pcs",
      unit_price: sale.amount || 0,
      amount: sale.amount || 0,
    }));

    await supabase.from("bill_items").insert(items);

    setNotice("Bill created successfully!");
    await loadWorkspace();
  }
}

// Record payment
async function recordBillPayment(
  billId: string,
  amount: number,
  paymentMethod: string
) {
  if (!supabase) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const result = await supabase.from("bill_payments").insert({
    bill_id: billId,
    amount,
    payment_method: paymentMethod,
    recorded_by: sessionData.session?.user.id,
  });

  if (!result.error) {
    setNotice("Payment recorded successfully!");
    await loadWorkspace();
  } else {
    setNotice(result.error.message);
  }
}

// Update bill status
async function updateBillStatus(billId: string, status: string) {
  if (!supabase) return;

  const result = await supabase
    .from("bills")
    .update({ status })
    .eq("id", billId);

  if (!result.error) {
    setNotice("Bill status updated!");
    await loadWorkspace();
  }
}

// Delete bill
async function deleteBill(billId: string) {
  if (!supabase) return;

  const result = await supabase.from("bills").delete().eq("id", billId);

  if (!result.error) {
    setNotice("Bill deleted!");
    await loadWorkspace();
  }
}
```

### Step 5: Add Bill UI Component

Add a new view option. Update the view state enum:

```typescript
type View =
  | "dashboard"
  | "sales"
  | "expense"
  | "harvest"
  | "labor"
  | "bills"  // Add this
  | "crop_batches"
  | "inventory"
  | "orders"
  | "cash_handovers"
  | "reports"
  | "settings";
```

Add button to navigation (around line ~3150):

```typescript
// In the view buttons section, add:
<button
  onClick={() => setView("bills")}
  className={view === "bills" ? "active" : ""}
>
  📄 Bills
</button>
```

### Step 6: Add Bills UI Section

Add this section in the render area (around line 3850+):

```typescript
{view === "bills" && (
  <div>
    <h2>📄 Customer Bills</h2>

    {/* Generate Bill Form */}
    <div className="card" style={{ marginBottom: "30px" }}>
      <h3>Generate New Bill</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          generateBillFromSales(
            String(formData.get("customer")),
            String(formData.get("startDate")),
            String(formData.get("endDate"))
          );
        }}
      >
        <label>
          Customer Name
          <input
            name="customer"
            type="text"
            required
            placeholder="Enter customer name"
          />
        </label>

        <label>
          Start Date
          <input name="startDate" type="date" required />
        </label>

        <label>
          End Date
          <input name="endDate" type="date" required />
        </label>

        <button type="submit" className="primary">
          Generate Bill
        </button>
      </form>
    </div>

    {/* Bills List */}
    <div className="card">
      <h3>Bills</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8f9fa" }}>
            <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
              Bill #
            </th>
            <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
              Customer
            </th>
            <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
              Date
            </th>
            <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
              Amount
            </th>
            <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
              Paid
            </th>
            <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
              Status
            </th>
            <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "10px" }}>{bill.bill_number}</td>
              <td style={{ padding: "10px" }}>{bill.customer_name}</td>
              <td style={{ padding: "10px" }}>{bill.bill_date}</td>
              <td style={{ padding: "10px" }}>¥{bill.total_amount.toLocaleString()}</td>
              <td style={{ padding: "10px" }}>¥{bill.paid_amount.toLocaleString()}</td>
              <td style={{ padding: "10px" }}>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background:
                      bill.status === "paid"
                        ? "#d4edda"
                        : bill.status === "overdue"
                          ? "#f8d7da"
                          : "#e7f3ff",
                    color:
                      bill.status === "paid"
                        ? "#155724"
                        : bill.status === "overdue"
                          ? "#721c24"
                          : "#004085",
                  }}
                >
                  {bill.status}
                </span>
              </td>
              <td style={{ padding: "10px" }}>
                <button
                  onClick={() => setSelectedBill(bill)}
                  style={{ marginRight: "5px", padding: "5px 10px", background: "#667eea", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  View
                </button>
                <button
                  onClick={() => deleteBill(bill.id)}
                  style={{ padding: "5px 10px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Selected Bill Detail View */}
    {selectedBill && (
      <div className="card" style={{ marginTop: "30px" }}>
        <h3>Bill #{selectedBill.bill_number}</h3>
        <p><strong>Customer:</strong> {selectedBill.customer_name}</p>
        <p><strong>Date:</strong> {selectedBill.bill_date}</p>
        <p><strong>Total:</strong> ¥{selectedBill.total_amount.toLocaleString()}</p>
        <p><strong>Paid:</strong> ¥{selectedBill.paid_amount.toLocaleString()}</p>
        <p><strong>Due:</strong> ¥{(selectedBill.total_amount - selectedBill.paid_amount).toLocaleString()}</p>

        {/* Record Payment */}
        <form
          style={{ marginTop: "20px" }}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            recordBillPayment(
              selectedBill.id,
              Number(formData.get("amount")),
              String(formData.get("method"))
            );
          }}
        >
          <h4>Record Payment</h4>
          <label>
            Amount
            <input name="amount" type="number" required placeholder="Enter payment amount" />
          </label>

          <label>
            Method
            <select name="method">
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Check</option>
              <option>Other</option>
            </select>
          </label>

          <button type="submit" style={{ background: "#28a745", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Record Payment
          </button>
        </form>

        <button
          onClick={() => setSelectedBill(null)}
          style={{ marginTop: "10px", padding: "8px 16px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Close
        </button>
      </div>
    )}
  </div>
)}
```

## Installation Steps

1. **Add PDF library** (for future PDF generation):
```bash
npm install jspdf html2canvas
```

2. **Run database migration**:
   - Go to Supabase Dashboard
   - SQL Editor
   - Copy & paste `supabase/bills.sql`
   - Click "Run"

3. **Add code to page.tsx**:
   - Type definitions
   - State management
   - Functions
   - UI components

4. **Test locally**:
```bash
npm run dev
```

5. **Commit and deploy**:
```bash
git add -A
git commit -m "Add customer bill feature

- Create bills, bill_items, bill_payments tables
- Add bill generation from sales
- Add payment tracking
- Add bill status management"
git push origin main
```

## Features

✅ **Generate Bills from Sales**
- Select customer name
- Select date range
- Auto-create bill with line items
- Calculate total

✅ **Bill Management**
- View all bills
- See bill status (draft, issued, paid, overdue)
- Delete bills

✅ **Payment Tracking**
- Record payments against bills
- Track paid amount
- See remaining due

✅ **Bill Status**
- draft: Not sent
- issued: Sent to customer
- sent: Delivery confirmed
- paid: Fully paid
- overdue: Payment overdue

## Future Enhancements

- [ ] Generate PDF bills
- [ ] Email bills to customers
- [ ] SMS reminders for overdue bills
- [ ] Bill templates
- [ ] Discount tracking
- [ ] Tax calculations
- [ ] Recurring bills

## Database Schema

```sql
bills
├─ id (UUID)
├─ farm_id (UUID)
├─ bill_number (TEXT) - Auto-generated YYYY-####
├─ customer_name (TEXT)
├─ bill_date (DATE)
├─ due_date (DATE)
├─ total_amount (NUMERIC)
├─ paid_amount (NUMERIC)
├─ status (TEXT) - draft/issued/sent/paid/overdue
├─ notes (TEXT)
└─ created_at, updated_at

bill_items
├─ id (UUID)
├─ bill_id (UUID)
├─ description (TEXT)
├─ quantity (NUMERIC)
├─ unit (TEXT)
├─ unit_price (NUMERIC)
└─ amount (NUMERIC)

bill_payments
├─ id (UUID)
├─ bill_id (UUID)
├─ payment_date (DATE)
├─ amount (NUMERIC)
├─ payment_method (TEXT)
└─ notes (TEXT)
```

---

**Total Implementation Time: ~4-5 hours**
- Database setup: 30 minutes
- Code implementation: 2-3 hours
- Testing & debugging: 1-1.5 hours
- Deployment: 30 minutes
