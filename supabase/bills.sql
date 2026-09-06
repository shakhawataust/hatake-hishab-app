-- Bill Management System for Customer Invoices

-- Bills Table
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'overdue')) DEFAULT 'draft',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, bill_number)
);

-- Bill Items Table (Line items in each bill)
CREATE TABLE public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT,
  unit_price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bill Payments Table (Track payments)
CREATE TABLE public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "farm members access bills" ON public.bills
  FOR ALL USING (public.is_farm_member(farm_id))
  WITH CHECK (public.is_farm_member(farm_id));

CREATE POLICY "farm members access bill items" ON public.bill_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE id = bill_id AND public.is_farm_member(farm_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE id = bill_id AND public.is_farm_member(farm_id)
    )
  );

CREATE POLICY "farm members access bill payments" ON public.bill_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_payments.bill_id AND public.is_farm_member(b.farm_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_payments.bill_id AND public.is_farm_member(b.farm_id)
    )
  );

-- Function to auto-generate bill number
CREATE OR REPLACE FUNCTION public.generate_bill_number(farm_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num TEXT;
  new_bill_number TEXT;
  counter INT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  counter := COALESCE(
    (SELECT CAST(SUBSTRING(bill_number FROM POSITION('-' IN bill_number) + 1) AS INT)
     FROM public.bills
     WHERE farm_id = farm_uuid AND bill_number LIKE year_part || '-%'
     ORDER BY created_at DESC
     LIMIT 1), 0
  ) + 1;
  sequence_num := LPAD(counter::TEXT, 4, '0');
  new_bill_number := year_part || '-' || sequence_num;
  RETURN new_bill_number;
END;
$$ LANGUAGE PLPGSQL;

-- Function to recalculate paid amount from payments
CREATE OR REPLACE FUNCTION public.update_bill_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.bills
  SET paid_amount = COALESCE(
    (SELECT SUM(amount) FROM public.bill_payments WHERE bill_id = NEW.bill_id),
    0
  )
  WHERE id = NEW.bill_id;
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

-- Trigger to auto-update paid amount
CREATE TRIGGER bill_payment_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.bill_payments
FOR EACH ROW
EXECUTE PROCEDURE public.update_bill_paid_amount();

-- Index for performance
CREATE INDEX idx_bills_farm_id ON public.bills(farm_id);
CREATE INDEX idx_bills_customer_name ON public.bills(customer_name);
CREATE INDEX idx_bills_status ON public.bills(status);
CREATE INDEX idx_bills_date ON public.bills(bill_date);
CREATE INDEX idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX idx_bill_payments_bill_id ON public.bill_payments(bill_id);
