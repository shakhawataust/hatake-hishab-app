"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = url && key ? createBrowserClient(url, key) : null;

type Kind = "expense" | "sale" | "harvest" | "labor";
type Farm = { id: string; name: string; role: string };
type Entry = {
  id: string;
  kind: Kind;
  occurred_on: string;
  crop: string | null;
  amount: number | null;
  quantity: number | null;
  unit: string | null;
  note: string | null;
};
type CropBatch = {
  id: string;
  code: string;
  crop: string;
  stage: string;
  planted_on: string | null;
  variety: string | null;
  bed: string | null;
  area: number | null;
  plants: number | null;
  expected_harvest_on: string | null;
  responsible_member: string | null;
  note: string | null;
};
type CropTask = {
  id: string;
  batch_id: string;
  task_type: string;
  due_on: string;
  responsible_member: string | null;
  instruction: string | null;
  completed: boolean;
};
type InventoryItem = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
};
type FarmOrder = {
  id: string;
  customer_name: string;
  crop: string | null;
  quantity: number | null;
  status: string;
  created_at: string;
};
type CareAlert = {
  id: string;
  type: "Fertilizer" | "Insect medicine" | "Harvest";
  due_on: string;
  crop: string;
  note: string;
};
type Investment = {
  id: string;
  date: string;
  member: string;
  amount: number;
  type: "Capital" | "Loan" | "Donation";
  note: string;
};
type Language = "bn" | "en" | "ja";
type MemberRole = "admin" | "accountant" | "field_member" | "sales";
type View =
  | "dashboard"
  | "expense"
  | "sales"
  | "harvest"
  | "batches"
  | "orders"
  | "stock"
  | "labor"
  | "investment"
  | "reports"
  | "settings";

const views: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "expense", label: "খরচ যোগ করুন", icon: "💸" },
  { id: "sales", label: "বিক্রি / Sales", icon: "🧺" },
  { id: "harvest", label: "Harvest", icon: "🥬" },
  { id: "batches", label: "Crop Batches", icon: "🌾" },
  { id: "orders", label: "Customers & Orders", icon: "📦" },
  { id: "stock", label: "Stock", icon: "🧰" },
  { id: "labor", label: "শ্রম ও যাতায়াত", icon: "👨‍🌾" },
  { id: "investment", label: "বিনিয়োগ", icon: "💰" },
  { id: "reports", label: "Reports", icon: "📈" },
  { id: "settings", label: "সেটিংস / Settings", icon: "⚙️" },
];
const labels: Record<Language, Record<View, string>> = {
  bn: {
    dashboard: "ড্যাশবোর্ড",
    expense: "খরচ",
    sales: "বিক্রি",
    harvest: "ফসল সংগ্রহ",
    batches: "ফসল ব্যাচ",
    orders: "ক্রেতা ও অর্ডার",
    stock: "স্টক",
    labor: "শ্রম ও যাতায়াত",
    investment: "বিনিয়োগ",
    reports: "রিপোর্ট",
    settings: "সেটিংস",
  },
  en: {
    dashboard: "Dashboard",
    expense: "Expense",
    sales: "Sales",
    harvest: "Harvest",
    batches: "Crop Batches",
    orders: "Customers & Orders",
    stock: "Stock",
    labor: "Labor & Travel",
    investment: "Investment",
    reports: "Reports",
    settings: "Settings",
  },
  ja: {
    dashboard: "ダッシュボード",
    expense: "経費",
    sales: "販売",
    harvest: "収穫",
    batches: "作物ロット",
    orders: "顧客・注文",
    stock: "在庫",
    labor: "作業・交通",
    investment: "出資",
    reports: "レポート",
    settings: "設定",
  },
};
const interfaceText: Record<
  Language,
  {
    community: string;
    export: string;
    expense: string;
    signOut: string;
    hero: string;
    heroText: string;
  }
> = {
  bn: {
    community: "কমিউনিটি ফার্ম ম্যানেজমেন্ট",
    export: "CSV এক্সপোর্ট",
    expense: "+ নতুন খরচ",
    signOut: "সাইন আউট",
    hero: "হাতাকে হিসাব প্রো",
    heroText:
      "খরচ, ফসল, বিক্রি, শ্রমঘণ্টা, স্টক, অর্ডার, বিনিয়োগ এবং লাভ-লোকসান—সব এক জায়গায়।",
  },
  en: {
    community: "Community Farm Management",
    export: "Export CSV",
    expense: "+ Expense",
    signOut: "Sign out",
    hero: "Hatake Hishab Pro",
    heroText:
      "Track costs, harvest, sales, labor, stock, customer orders, investment and profit sharing in one place.",
  },
  ja: {
    community: "コミュニティ農園管理",
    export: "CSVを出力",
    expense: "+ 経費を追加",
    signOut: "サインアウト",
    hero: "畑 হিসাব プロ",
    heroText:
      "経費、収穫、販売、作業時間、在庫、注文、出資、利益配分を一元管理します。",
  },
};
const laborText: Record<
  Language,
  {
    title: string;
    detail: string;
    date: string;
    member: string;
    hours: string;
    rate: string;
    transport: string;
    crop: string;
    task: string;
    save: string;
    records: string;
    saved: string;
    cost: string;
    remove: string;
    none: string;
  }
> = {
  bn: {
    title: "শ্রমঘণ্টা ও যাতায়াত",
    detail: "সদস্যের অবদান",
    date: "তারিখ",
    member: "সদস্য",
    hours: "ঘণ্টা",
    rate: "প্রতি ঘণ্টার খরচ (¥)",
    transport: "যাতায়াত খরচ (¥)",
    crop: "ফসল",
    task: "কাজ",
    save: "শ্রম ও যাতায়াত সংরক্ষণ করুন",
    records: "শ্রম ও যাতায়াতের বিবরণ",
    saved: "সংরক্ষিত রেকর্ড",
    cost: "খরচ",
    remove: "মুছুন",
    none: "এখনো কোনো শ্রম বা যাতায়াতের রেকর্ড নেই।",
  },
  en: {
    title: "Labor & Travel",
    detail: "Member contribution",
    date: "Date",
    member: "Member",
    hours: "Hours",
    rate: "Hourly cost (¥)",
    transport: "Transport cost (¥)",
    crop: "Crop",
    task: "Task",
    save: "Save labor & travel",
    records: "Labor & travel details",
    saved: "Saved records",
    cost: "Cost",
    remove: "Delete",
    none: "No labor or travel records yet.",
  },
  ja: {
    title: "作業・交通",
    detail: "メンバーの貢献",
    date: "日付",
    member: "メンバー",
    hours: "時間",
    rate: "時給コスト (¥)",
    transport: "交通費 (¥)",
    crop: "作物",
    task: "作業内容",
    save: "作業・交通を保存",
    records: "作業・交通の詳細",
    saved: "保存済み記録",
    cost: "費用",
    remove: "削除",
    none: "作業・交通の記録はまだありません。",
  },
};
const commonText: Record<
  Language,
  {
    date: string;
    crop: string;
    amount: string;
    quantity: string;
    unit: string;
    note: string;
    save: string;
    records: string;
    customer: string;
    status: string;
    category: string;
    item: string;
    stock: string;
    delete: string;
    noRecords: string;
  }
> = {
  bn: {
    date: "তারিখ",
    crop: "ফসল",
    amount: "পরিমাণ (¥)",
    quantity: "পরিমাণ",
    unit: "একক",
    note: "নোট",
    save: "সংরক্ষণ করুন",
    records: "সংরক্ষিত রেকর্ড",
    customer: "ক্রেতা",
    status: "অবস্থা",
    category: "বিভাগ",
    item: "আইটেম",
    stock: "স্টক",
    delete: "মুছুন",
    noRecords: "এখনো কোনো রেকর্ড নেই।",
  },
  en: {
    date: "Date",
    crop: "Crop",
    amount: "Amount (¥)",
    quantity: "Quantity",
    unit: "Unit",
    note: "Note",
    save: "Save",
    records: "Saved records",
    customer: "Customer",
    status: "Status",
    category: "Category",
    item: "Item",
    stock: "Stock",
    delete: "Delete",
    noRecords: "No records yet.",
  },
  ja: {
    date: "日付",
    crop: "作物",
    amount: "金額 (¥)",
    quantity: "数量",
    unit: "単位",
    note: "メモ",
    save: "保存",
    records: "保存済み記録",
    customer: "顧客",
    status: "ステータス",
    category: "カテゴリー",
    item: "品目",
    stock: "在庫",
    delete: "削除",
    noRecords: "記録はまだありません。",
  },
};
const crops = [
  "করলা (Bitter gourd)",
  "লাউ (Bottle gourd)",
  "লাউ পাতা (Lau leaf)",
  "কুমড়া (Pumpkin)",
  "কুমড়া পাতা (Pumpkin leaf)",
  "পুঁইশাক (Malabar spinach)",
  "লাল শাক (Lal shak)",
  "ডাটা শাক (Data shak)",
  "ধনিয়া (Dhania / Coriander)",
  "পুদিনা (Mint)",
  "পুদিনা পাতা (Pudina pata)",
  "মরিচ (Chili)",
  "বেগুন (Eggplant)",
  "আলু (Potato)",
  "শিম (Bean)",
  "বরবটি (Borboti)",
  "Other",
];
const cropCodeGuide = [
  ["KRLA", "করলা", "Bitter gourd", "~Day 55"],
  ["LAU", "লাউ", "Bottle gourd", "~Day 65"],
  ["PUI", "পুঁইশাক", "Malabar spinach", "~Day 35"],
  ["PUD", "পুদিনা", "Mint", "~Day 30"],
  ["MRC", "মরিচ", "Chili", "~Day 75"],
  ["BGN", "বেগুন", "Eggplant", "~Day 70"],
  ["ALU", "আলু", "Potato", "~Day 90"],
  ["SHM", "শিম", "Bean", "~Day 55"],
  ["DBR", "বরবটি", "Borboti", "~Day 50"],
] as const;
const expenseCategories = [
  "Tools / টুলস",
  "Seeds / বীজ",
  "Seedlings / চারা",
  "Fertilizer / সার",
  "Pesticide / Medicine",
  "Fuel / Oil cost",
  "Transport / যাতায়াত",
  "Labor / শ্রম",
  "Water / Utility",
  "Packaging",
  "Rent / ভাড়া",
  "Other / অন্যান্য",
];
const taskTypes = [
  "Fertilizer",
  "Insect medicine",
  "Watering",
  "Weeding",
  "Crop check",
  "Harvest",
  "Other",
];
const batchStages = [
  "Planned",
  "Seedling",
  "Planted",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Harvesting",
  "Finished",
];
const laborCategory = "Labor / Travel";
const unknownHolder = "Not recorded";
const careAlertsKey = "hatake-hishab-care-alerts";
const investmentsKey = "hatake-hishab-investments";

const yen = (value: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
// Notes are stored as "Label: value | Label: value", so read one label back.
const noteValue = (note: string | null | undefined, label: string) =>
  note?.match(new RegExp(`${label}:\\s*([^|]+)`, "i"))?.[1].trim() ?? "";
const noteLabels = [
  "Customer",
  "Channel",
  "Payment",
  "Cash with",
  "Paid by",
  "Sellable",
  "Waste",
];
// Whatever the member typed themselves, without the labelled parts the form
// rebuilds on save.
const freeNote = (note: string | null | undefined) =>
  (note ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !noteLabels.some((label) => new RegExp(`^${label}:`, "i").test(part)),
    )
    .join(" | ");
const transportFromNote = (note?: string | null) => {
  const match = note?.match(/Transport:\s*[¥￥]?\s*([\d,]+)/i)?.[1];
  return Number((match ?? "0").replaceAll(",", "")) || 0;
};
const today = () => new Date().toISOString().slice(0, 10);
const kindForView = (view: View): Kind =>
  view === "sales"
    ? "sale"
    : view === "harvest"
      ? "harvest"
      : view === "labor"
        ? "labor"
        : "expense";

const workbook2026Entries = (
  [
    ["expense", "2026-01-01", "YK650MR", 165000, "Shakhawat"],
    ["expense", "2026-01-01", "Net", 6000, "Shakhawat"],
    ["expense", "2026-01-01", "Land Rent", 15000, "Shakhawat"],
    ["expense", "2026-01-01", "Grass Cutter", 11000, "Shakhawat"],
    ["expense", "2026-05-28", "Homes", 8289, "Shakhawat"],
    ["expense", "2026-05-28", "Homes", 4928, "Shakhawat"],
    ["expense", "2026-01-01", "Homes", 4803, "Shakhawat"],
    ["expense", "2026-01-01", "Cainz", 8476, "Shakhawat"],
    ["expense", "2026-01-01", "Joyful Honda", 14744, "Shakhawat"],
    ["expense", "2026-01-01", "Pesticide", 8442, "Shakhawat"],
    ["expense", "2026-07-04", "Joyful Honda", 8800, "Shakhawat"],
    ["expense", "2026-07-03", "Tent", 23500, "Rafi"],
    ["expense", "2026-07-03", "Pipe + Connector", 4261, "Rafi"],
    ["expense", "2026-07-03", "Daisha", 8577, "Rafi"],
    ["expense", "2026-06-27", "Homes", 2428, "Rafi"],
    ["expense", "2026-06-06", "Homes", 5605, "Rafi"],
    ["expense", "2026-08-01", "Joyful", 24247, "Rafi"],
    [
      "sale",
      "2026-08-08",
      "Unspecified",
      6700,
      "Hira — 5200 (Lau, Mint), Kumra Shak (1500)",
    ],
    ["sale", "2026-08-08", "Unspecified", 4520, "Buyer: Arif"],
    [
      "sale",
      "2026-08-08",
      "Unspecified",
      2100,
      "Lumen (1000) + Piash (800) + Random (300)",
    ],
    ["sale", "2026-08-06", "Unspecified", 5700, "Buyer: Abu"],
    ["sale", "2026-08-01", "Unspecified", 5000, "Buyer: Faiyaz (to confirm)"],
    ["sale", "2026-08-01", "Unspecified", 900, "Buyer: Arif"],
    ["sale", "2026-08-01", "Unspecified", 6352, "Buyer: Hira"],
    ["sale", "2026-08-01", "Unspecified", 5100, "Buyer: Abu"],
    ["sale", "2026-08-01", "Unspecified", 4100, "Buyer: Jannat"],
  ] as [Kind, string, string, number, string][]
).map(([kind, occurred_on, crop, amount, detail]) => ({
  kind,
  occurred_on,
  crop,
  amount,
  quantity: null,
  unit: null,
  note: `AAA Hatake 2026 import — ${detail}${occurred_on === "2026-01-01" ? " (source date was blank)" : ""}`,
}));

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [batches, setBatches] = useState<CropBatch[]>([]);
  const [cropTasks, setCropTasks] = useState<CropTask[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<FarmOrder[]>([]);
  const [careAlerts, setCareAlerts] = useState<CareAlert[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [alertsReady, setAlertsReady] = useState(false);
  const [investmentsReady, setInvestmentsReady] = useState(false);
  const [reportMonth, setReportMonth] = useState(today().slice(0, 7));
  const [editing, setEditing] = useState<Entry | null>(null);
  const [editingBatch, setEditingBatch] = useState<CropBatch | null>(null);
  const [editingTask, setEditingTask] = useState<CropTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [view, setView] = useState<View>("dashboard");
  const [language, setLanguage] = useState<Language>("bn");

  async function loadWorkspace() {
    if (!supabase) return;
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    setEmail(session?.user.email ?? null);
    if (!session) {
      setFarm(null);
      setEntries([]);
      setBatches([]);
      setCropTasks([]);
      setInventory([]);
      setOrders([]);
      setLoading(false);
      return;
    }
    await supabase.rpc("claim_pending_farm_invites");
    const { data: membership } = await supabase
      .from("farm_members")
      .select("role, farms(id,name)")
      .limit(1);
    const link = membership?.[0] as
      | {
          role: string;
          farms:
            | { id: string; name: string }
            | { id: string; name: string }[]
            | null;
        }
      | undefined;
    const selected = Array.isArray(link?.farms) ? link?.farms[0] : link?.farms;
    if (selected) {
      setFarm({
        id: selected.id,
        name: selected.name,
        role: link?.role ?? "field_member",
      });
      const [
        entryResult,
        batchResult,
        inventoryResult,
        orderResult,
        taskResult,
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("farm_id", selected.id)
          .order("occurred_on", { ascending: false })
          .limit(100),
        supabase
          .from("crop_batches")
          .select("*")
          .eq("farm_id", selected.id)
          .order("planted_on", { ascending: false }),
        supabase
          .from("inventory_items")
          .select("*")
          .eq("farm_id", selected.id)
          .order("name"),
        supabase
          .from("orders")
          .select("*")
          .eq("farm_id", selected.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("crop_tasks")
          .select("*")
          .eq("farm_id", selected.id)
          .order("due_on"),
      ]);
      setEntries((entryResult.data ?? []) as Entry[]);
      setBatches((batchResult.data ?? []) as CropBatch[]);
      setInventory((inventoryResult.data ?? []) as InventoryItem[]);
      setOrders((orderResult.data ?? []) as FarmOrder[]);
      setCropTasks((taskResult.data ?? []) as CropTask[]);
    } else setFarm(null);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void loadWorkspace();
    });
    return () => {
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setCareAlerts(
          JSON.parse(window.localStorage.getItem(careAlertsKey) ?? "[]"),
        );
      } catch {
        setCareAlerts([]);
      }
      try {
        setInvestments(
          JSON.parse(window.localStorage.getItem(investmentsKey) ?? "[]"),
        );
      } catch {
        setInvestments([]);
      }
      setAlertsReady(true);
      setInvestmentsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (alertsReady)
      window.localStorage.setItem(careAlertsKey, JSON.stringify(careAlerts));
  }, [alertsReady, careAlerts]);

  useEffect(() => {
    if (investmentsReady)
      window.localStorage.setItem(investmentsKey, JSON.stringify(investments));
  }, [investmentsReady, investments]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("hatake-hishab-language");
      if (saved === "bn" || saved === "en" || saved === "ja")
        setLanguage(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({
            email: String(form.get("email")),
            password: String(form.get("password")),
          })
        : await supabase.auth.signUp({
            email: String(form.get("email")),
            password: String(form.get("password")),
            options: { emailRedirectTo: window.location.origin },
          });
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : mode === "signUp"
          ? "Check your email to confirm the account."
          : "Signed in.",
    );
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const name = String(
      new FormData(event.currentTarget).get("farmName"),
    ).trim();
    setBusy(true);
    const result = await supabase.rpc("create_farm", { farm_name: name });
    setBusy(false);
    setNotice(
      result.error ? result.error.message : "Farm created. You are the Admin.",
    );
    if (!result.error) await loadWorkspace();
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { data: sessionData } = await supabase.auth.getSession();
    const amount = String(form.get("amount"));
    const quantity = String(form.get("quantity"));
    const extraNote = [
      form.get("customer") ? `Customer: ${form.get("customer")}` : "",
      form.get("channel") ? `Channel: ${form.get("channel")}` : "",
      form.get("payment") ? `Payment: ${form.get("payment")}` : "",
      form.get("cash_with")
        ? `Cash with: ${String(form.get("cash_with")).trim()}`
        : "",
      form.get("paid_by") ? `Paid by: ${form.get("paid_by")}` : "",
      form.get("sellable") ? `Sellable: ${form.get("sellable")}` : "",
      form.get("waste") ? `Waste: ${form.get("waste")}` : "",
    ].filter(Boolean);
    const note = [String(form.get("note") || ""), ...extraNote]
      .filter(Boolean)
      .join(" | ");
    setBusy(true);
    const record = {
      kind: form.get("kind"),
      occurred_on: form.get("date"),
      crop: String(form.get("crop")) || null,
      amount: amount ? Number(amount) : null,
      quantity: quantity ? Number(quantity) : null,
      unit: String(form.get("unit")) || null,
      note: note || null,
    };
    const result = editing
      ? await supabase.from("transactions").update(record).eq("id", editing.id)
      : await supabase.from("transactions").insert({
          ...record,
          farm_id: farm.id,
          created_by: sessionData.session?.user.id,
        });
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : editing
          ? "Record updated."
          : "Record saved.",
    );
    if (!result.error) {
      formElement.reset();
      setEditing(null);
      await loadWorkspace();
    }
  }

  async function saveLabor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { data: sessionData } = await supabase.auth.getSession();
    const hours = Number(form.get("hours")) || 0;
    const rate = Number(form.get("rate")) || 0;
    const transport = Number(form.get("transport")) || 0;
    const member = String(form.get("member")).trim();
    const task = String(form.get("task")).trim();
    setBusy(true);
    const record = {
      kind: "labor",
      occurred_on: form.get("date"),
      crop: String(form.get("crop")) || null,
      amount: hours * rate + transport,
      quantity: hours,
      unit: "hours",
      note: `Member: ${member} | Task: ${task || "—"} | Rate: ${yen(rate)}/h | Transport: ${yen(transport)}`,
    };
    const result = editing
      ? await supabase.from("transactions").update(record).eq("id", editing.id)
      : await supabase.from("transactions").insert({
          ...record,
          farm_id: farm.id,
          created_by: sessionData.session?.user.id,
        });
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : editing
          ? "Labor and travel record updated."
          : "Labor and travel record saved.",
    );
    if (!result.error) {
      formElement.reset();
      setEditing(null);
      await loadWorkspace();
    }
  }

  async function deleteEntry(id: string) {
    if (!supabase || !window.confirm("Delete this record?")) return;
    setBusy(true);
    const result = await supabase.from("transactions").delete().eq("id", id);
    setBusy(false);
    setNotice(result.error ? result.error.message : "Record deleted.");
    if (!result.error) await loadWorkspace();
  }

  async function deleteBatch(id: string) {
    if (
      !supabase ||
      !window.confirm("Delete this crop batch and all of its planned tasks?")
    )
      return;
    setBusy(true);
    const result = await supabase.from("crop_batches").delete().eq("id", id);
    setBusy(false);
    setNotice(result.error ? result.error.message : "Crop batch deleted.");
    if (!result.error) await loadWorkspace();
  }

  async function saveCropTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    const details = {
      batch_id: String(form.get("batch_id")),
      task_type: String(form.get("task_type")),
      due_on: String(form.get("due_on")),
      responsible_member: String(form.get("responsible_member")) || null,
      instruction: String(form.get("instruction")) || null,
    };
    const result = editingTask
      ? await supabase
          .from("crop_tasks")
          .update(details)
          .eq("id", editingTask.id)
      : await supabase
          .from("crop_tasks")
          .insert({ farm_id: farm.id, ...details });
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : editingTask
          ? "Farm task updated."
          : "Farm task added.",
    );
    if (!result.error) {
      formElement.reset();
      setEditingTask(null);
      await loadWorkspace();
    }
  }

  async function completeCropTask(task: CropTask) {
    if (!supabase) return;
    setBusy(true);
    const result = await supabase
      .from("crop_tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : task.completed
          ? "Task reopened."
          : "Task completed.",
    );
    if (!result.error) await loadWorkspace();
  }

  async function deleteCropTask(id: string) {
    if (!supabase || !window.confirm("Delete this farm task?")) return;
    setBusy(true);
    const result = await supabase.from("crop_tasks").delete().eq("id", id);
    setBusy(false);
    setNotice(result.error ? result.error.message : "Farm task deleted.");
    if (!result.error) await loadWorkspace();
  }

  async function addFarmMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    const result = await supabase.rpc("invite_or_add_farm_member", {
      target_farm: farm.id,
      member_email: String(form.get("email")).trim().toLowerCase(),
      desired_role: String(form.get("role")) as MemberRole,
    });
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : (result.data ?? "Member added to this farm."),
    );
    if (!result.error) formElement.reset();
  }

  async function saveBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { data: sessionData } = await supabase.auth.getSession();
    const crop = String(form.get("crop"));
    const plantedOn = String(form.get("planted_on"));
    const bed = String(form.get("bed")).trim().toUpperCase() || "X";
    const prefix =
      crop
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 4)
        .toUpperCase() || "CROP";
    const month = (plantedOn || today()).slice(2, 7).replace("-", "");
    const baseCode = `${prefix}-${month}-${bed}`;
    const code = `${baseCode}-${String(batches.filter((batch) => batch.code.startsWith(baseCode)).length + 1).padStart(2, "0")}`;
    const harvestDays =
      crop.includes("লাউ") || crop.includes("Pumpkin")
        ? 65
        : crop.includes("করলা")
          ? 55
          : 45;
    const expectedHarvest = new Date(`${plantedOn || today()}T00:00:00`);
    expectedHarvest.setDate(expectedHarvest.getDate() + harvestDays);
    const expectedHarvestOn =
      String(form.get("expected_harvest_on")) ||
      expectedHarvest.toISOString().slice(0, 10);
    const details = {
      crop,
      stage: String(form.get("stage")),
      planted_on: plantedOn || null,
      variety: String(form.get("variety")) || null,
      bed,
      area: String(form.get("area")) ? Number(form.get("area")) : null,
      plants: String(form.get("plants")) ? Number(form.get("plants")) : null,
      expected_harvest_on: expectedHarvestOn,
      responsible_member: String(form.get("responsible_member")) || null,
      note: String(form.get("note")) || null,
    };
    setBusy(true);
    if (editingBatch) {
      // The code is printed on expense and labor notes, so it stays fixed, and
      // the generated schedule is left alone rather than duplicated.
      const update = await supabase
        .from("crop_batches")
        .update({
          ...details,
          // A cleared date means cleared, not recalculated from the heuristic.
          expected_harvest_on: String(form.get("expected_harvest_on")) || null,
        })
        .eq("id", editingBatch.id);
      setBusy(false);
      setNotice(update.error ? update.error.message : "Crop batch updated.");
      if (!update.error) {
        formElement.reset();
        setEditingBatch(null);
        await loadWorkspace();
      }
      return;
    }
    const result = await supabase
      .from("crop_batches")
      .insert({
        farm_id: farm.id,
        code,
        ...details,
        created_by: sessionData.session?.user.id,
      })
      .select("id")
      .single();
    if (!result.error && result.data)
      await supabase.from("crop_tasks").insert([
        {
          farm_id: farm.id,
          batch_id: result.data.id,
          task_type: "Crop check",
          due_on: new Date(
            new Date(`${plantedOn || today()}T00:00:00`).getTime() +
              3 * 86400000,
          )
            .toISOString()
            .slice(0, 10),
          responsible_member: String(form.get("responsible_member")) || null,
          instruction: "Check moisture and transplant establishment.",
        },
        {
          farm_id: farm.id,
          batch_id: result.data.id,
          task_type: "Fertilizer",
          due_on: new Date(
            new Date(`${plantedOn || today()}T00:00:00`).getTime() +
              21 * 86400000,
          )
            .toISOString()
            .slice(0, 10),
          responsible_member: String(form.get("responsible_member")) || null,
          instruction:
            "Apply fertilizer following product label and soil condition.",
        },
        {
          farm_id: farm.id,
          batch_id: result.data.id,
          task_type: "Harvest check",
          due_on: expectedHarvestOn,
          responsible_member: String(form.get("responsible_member")) || null,
          instruction: "Check harvest readiness and quality.",
        },
      ]);
    setBusy(false);
    setNotice(result.error ? result.error.message : "Crop batch saved.");
    if (!result.error) {
      formElement.reset();
      await loadWorkspace();
    }
  }

  async function saveInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    const result = await supabase.from("inventory_items").insert({
      farm_id: farm.id,
      name: String(form.get("name")),
      category: String(form.get("category")) || null,
      quantity: Number(form.get("quantity")),
      unit: String(form.get("unit")) || "pcs",
    });
    setBusy(false);
    setNotice(result.error ? result.error.message : "Stock item saved.");
    if (!result.error) {
      formElement.reset();
      await loadWorkspace();
    }
  }

  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    const result = await supabase.from("orders").insert({
      farm_id: farm.id,
      customer_name: String(form.get("customer_name")),
      crop: String(form.get("crop")) || null,
      quantity: String(form.get("quantity"))
        ? Number(form.get("quantity"))
        : null,
      status: String(form.get("status")) || "new",
    });
    setBusy(false);
    setNotice(result.error ? result.error.message : "Order saved.");
    if (!result.error) {
      formElement.reset();
      await loadWorkspace();
    }
  }

  function saveCareAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const alert: CareAlert = {
      id: crypto.randomUUID(),
      type: form.get("type") as CareAlert["type"],
      due_on: String(form.get("due_on")),
      crop: String(form.get("crop")),
      note: String(form.get("note")),
    };
    setCareAlerts((current) =>
      [...current, alert].sort((a, b) => a.due_on.localeCompare(b.due_on)),
    );
    formElement.reset();
    setNotice(`${alert.type} alert scheduled for ${alert.due_on}.`);
  }

  function removeCareAlert(id: string) {
    setCareAlerts((current) => current.filter((alert) => alert.id !== id));
  }

  function saveInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const item: Investment = {
      id: crypto.randomUUID(),
      date: String(form.get("date")),
      member: String(form.get("member")),
      amount: Number(form.get("amount")),
      type: form.get("type") as Investment["type"],
      note: String(form.get("note")),
    };
    setInvestments((current) =>
      [...current, item].sort((a, b) => b.date.localeCompare(a.date)),
    );
    formElement.reset();
    setNotice("Investment saved.");
  }

  function removeInvestment(id: string) {
    setInvestments((current) => current.filter((item) => item.id !== id));
  }

  async function enableBrowserAlerts() {
    if (!("Notification" in window)) {
      setNotice("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      careAlerts
        .filter((alert) => alert.due_on <= today())
        .forEach(
          (alert) =>
            new Notification(`Hatake Hishab: ${alert.type}`, {
              body: `${alert.crop || "Farm care"} is due today. ${alert.note}`,
            }),
        );
      setNotice(
        "Browser alerts enabled. You will receive due alerts while this app is open.",
      );
    } else setNotice("Browser alert permission was not granted.");
  }

  async function import2026Workbook() {
    if (!supabase || !farm) return;
    const imported = workbook2026Entries.filter(
      (item) =>
        !entries.some(
          (entry) =>
            entry.kind === item.kind &&
            entry.occurred_on === item.occurred_on &&
            entry.amount === item.amount &&
            entry.note === item.note,
        ),
    );
    if (!imported.length) {
      setNotice("The 2026 workbook entries have already been imported.");
      return;
    }
    if (
      !window.confirm(
        `Import ${imported.length} records from AAA Hatake Cost Tracking.xlsx?`,
      )
    )
      return;
    const { data: sessionData } = await supabase.auth.getSession();
    setBusy(true);
    const result = await supabase.from("transactions").insert(
      imported.map((item) => ({
        ...item,
        farm_id: farm.id,
        created_by: sessionData.session?.user.id,
      })),
    );
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : `${imported.length} workbook records imported.`,
    );
    if (!result.error) {
      setView("dashboard");
      await loadWorkspace();
    }
  }

  function exportCsv() {
    const header = [
      "Date",
      "Type",
      "Crop",
      "Amount (JPY)",
      "Quantity",
      "Unit",
      "Note",
    ];
    const rows = entries.map((entry) => [
      entry.occurred_on,
      entry.kind,
      entry.crop ?? "",
      entry.amount ?? "",
      entry.quantity ?? "",
      entry.unit ?? "",
      entry.note ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `${farm?.name ?? "hatake-hishab"}-ledger.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const summary = useMemo(
    () =>
      entries.reduce(
        (all, row) => {
          if (row.kind === "expense" || row.kind === "labor")
            all.expense += Number(row.amount ?? 0);
          if (row.kind === "sale") all.sales += Number(row.amount ?? 0);
          if (row.kind === "harvest") all.harvest += Number(row.quantity ?? 0);
          return all;
        },
        { expense: 0, sales: 0, harvest: 0 },
      ),
    [entries],
  );

  const monthly = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - 5 + index);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const rows = entries.filter((entry) =>
          entry.occurred_on.startsWith(key),
        );
        return {
          label: date.toLocaleDateString("en", { month: "short" }),
          sales: rows
            .filter((row) => row.kind === "sale")
            .reduce((total, row) => total + Number(row.amount ?? 0), 0),
          expense: rows
            .filter((row) => row.kind === "expense" || row.kind === "labor")
            .reduce((total, row) => total + Number(row.amount ?? 0), 0),
        };
      }),
    [entries],
  );

  const cropSales = useMemo(
    () =>
      Object.entries(
        entries
          .filter((entry) => entry.kind === "sale")
          .reduce<Record<string, number>>((all, entry) => {
            const crop = entry.crop || "Other";
            all[crop] = (all[crop] ?? 0) + Number(entry.amount ?? 0);
            return all;
          }, {}),
      ).sort((a, b) => b[1] - a[1]),
    [entries],
  );
  const displayedEntries =
    view === "sales"
      ? entries.filter((entry) => entry.kind === "sale")
      : view === "harvest"
        ? entries.filter((entry) => entry.kind === "harvest")
        : view === "expense"
          ? entries.filter((entry) => entry.kind === "expense")
          : view === "labor"
            ? entries.filter((entry) => entry.kind === "labor")
            : entries;
  const maxChart = Math.max(
    1,
    ...monthly.flatMap((month) => [month.sales, month.expense]),
  );
  const editField = (label: string) => noteValue(editing?.note, label);
  // A saved row may hold a crop or category that is no longer in the list, so
  // keep it selectable instead of silently changing it.
  const withOption = (options: readonly string[], value?: string | null) =>
    value && !options.includes(value) ? [value, ...options] : [...options];
  const cropOptions = (options: readonly string[]) =>
    withOption(options, editing?.crop);
  // The note keeps the rate as "￥1,000/h"; the form needs a plain number.
  const editedRate = Number(editField("Rate").replace(/[^\d.]/g, "")) || 0;
  const startTaskEdit = (task: CropTask) => {
    setEditingTask(task);
    setNotice(`Editing the ${task.task_type} task.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startBatchEdit = (batch: CropBatch) => {
    setEditingBatch(batch);
    setNotice(`Editing batch ${batch.code}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startEdit = (entry: Entry) => {
    setEditing(entry);
    setNotice("Editing a saved record.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const paidSales = entries.filter(
    (entry) =>
      entry.kind === "sale" && /Payment:\s*Paid/i.test(entry.note ?? ""),
  );
  // Cash each person is carrying: money they collected from paid sales, less
  // whatever they have already spent on farm expenses.
  const cashInHand = (() => {
    const people = new Map<string, { collected: number; spent: number }>();
    const person = (name: string) => {
      if (!people.has(name)) people.set(name, { collected: 0, spent: 0 });
      return people.get(name)!;
    };
    paidSales.forEach((entry) => {
      person(noteValue(entry.note, "Cash with") || unknownHolder).collected +=
        Number(entry.amount ?? 0);
    });
    entries
      .filter((entry) => entry.kind === "expense")
      .forEach((entry) => {
        const payer = noteValue(entry.note, "Paid by");
        // No payer recorded means we cannot say whose cash it came out of.
        if (payer) person(payer).spent += Number(entry.amount ?? 0);
      });
    return [...people.entries()]
      .map(([name, totals]) => ({
        name,
        ...totals,
        balance: totals.collected - totals.spent,
      }))
      .sort((a, b) => b.balance - a.balance);
  })();
  const untrackedSpend = entries
    .filter(
      (entry) => entry.kind === "expense" && !noteValue(entry.note, "Paid by"),
    )
    .reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
  const pendingSales = entries
    .filter(
      (entry) =>
        entry.kind === "sale" && /Payment:\s*Pending/i.test(entry.note ?? ""),
    )
    .reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
  // Older rows carry no Payment tag; show them so the panel still adds up.
  const untaggedSales = entries
    .filter(
      (entry) =>
        entry.kind === "sale" && !/Payment:\s*\w/i.test(entry.note ?? ""),
    )
    .reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
  // Names already used anywhere, so the field can be filled with one tap.
  const knownHolders = [
    ...new Set(
      entries
        .flatMap((entry) => [
          noteValue(entry.note, "Cash with"),
          noteValue(entry.note, "Paid by"),
          noteValue(entry.note, "Member"),
        ])
        .filter(Boolean),
    ),
  ].sort();

  if (!supabase)
    return (
      <main className="app-shell">
        <section className="empty">
          <h1>Supabase connection required</h1>
          <p>
            Add the Project URL and publishable key to <code>.env.local</code>,
            then restart the app.
          </p>
        </section>
      </main>
    );
  if (loading)
    return (
      <main className="app-shell">
        <section className="empty">Loading Hatake Hishab…</section>
      </main>
    );
  if (!email)
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Hatake Hishab</p>
          <h1>Shared farm management</h1>
          <p>Secure access for your farm team.</p>
          <div className="tabs">
            <button
              className={mode === "signIn" ? "active" : ""}
              onClick={() => setMode("signIn")}
            >
              Sign in
            </button>
            <button
              className={mode === "signUp" ? "active" : ""}
              onClick={() => setMode("signUp")}
            >
              Create account
            </button>
          </div>
          <form onSubmit={authenticate} className="form">
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" minLength={8} required />
            </label>
            <button className="primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signIn"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
          {notice && <p className="notice">{notice}</p>}
        </section>
      </main>
    );
  if (!farm)
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Welcome, {email}</p>
          <h1>Create your farm</h1>
          <p>The account that creates the farm becomes its Admin.</p>
          <form onSubmit={createFarm} className="form">
            <label>
              Farm name
              <input
                name="farmName"
                required
                placeholder="Hatake Hishab Farm"
              />
            </label>
            <button className="primary" disabled={busy}>
              Create farm as Admin
            </button>
          </form>
          {notice && <p className="notice">{notice}</p>}
        </section>
      </main>
    );

  const entryView = ["expense", "sales", "harvest"].includes(view);
  const selectedKind = kindForView(view);
  const pageTitle = labels[language][view];
  const costPerKg = summary.harvest
    ? yen(summary.expense / summary.harvest)
    : yen(0);
  const openOrders = orders.filter(
    (order) => !["delivered", "cancelled"].includes(order.status.toLowerCase()),
  );
  const expenseMix = Object.entries(
    entries
      .filter((entry) => entry.kind === "expense" || entry.kind === "labor")
      .reduce<Record<string, number>>((all, entry) => {
        const detail = `${entry.crop ?? ""} ${entry.note ?? ""}`.toLowerCase();
        const amount = Number(entry.amount ?? 0);
        if (entry.kind === "labor") {
          // Keep the whole labor amount (hours * rate + transport) in one
          // bucket so it matches the Labor & Travel page total. The travel
          // share is called out under the label.
          all[laborCategory] = (all[laborCategory] ?? 0) + amount;
          return all;
        }
        const category =
          detail.includes("fertil") || detail.includes("সার")
            ? "Fertilizer / সার"
            : detail.includes("pestic") ||
                detail.includes("insect") ||
                detail.includes("medicine") ||
                detail.includes("ওষুধ")
              ? "Pesticide / Medicine"
              : detail.includes("seed") || detail.includes("বীজ")
                ? "Seeds / বীজ"
                : detail.includes("transport") ||
                    detail.includes("fuel") ||
                    detail.includes("যাতায়াত")
                  ? "Transport / যাতায়াত"
                  : detail.includes("tool") ||
                      detail.includes("cutter") ||
                      detail.includes("drill")
                    ? "Tools / টুলস"
                    : "Other / অন্যান্য";
        all[category] = (all[category] ?? 0) + amount;
        return all;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxExpenseMix = Math.max(1, ...expenseMix.map(([, amount]) => amount));
  const laborTravel = entries
    .filter((entry) => entry.kind === "labor")
    .reduce(
      (total, entry) =>
        total +
        Math.min(transportFromNote(entry.note), Number(entry.amount ?? 0)),
      0,
    );
  const lowStock = inventory.filter((item) => Number(item.quantity) <= 2);
  const customerNames = [
    ...new Set(orders.map((order) => order.customer_name)),
  ].sort();
  const plannerToday = new Date(`${today()}T00:00:00`).getTime();
  const plannerWeek = plannerToday + 7 * 86400000;
  const plannerHarvestWindow = plannerToday + 14 * 86400000;
  const plannerStats = {
    active: batches.filter((batch) => batch.stage !== "Finished").length,
    nextWeek: cropTasks.filter(
      (task) =>
        !task.completed &&
        new Date(`${task.due_on}T00:00:00`).getTime() <= plannerWeek &&
        new Date(`${task.due_on}T00:00:00`).getTime() >= plannerToday,
    ).length,
    harvestSoon: batches.filter(
      (batch) =>
        batch.expected_harvest_on &&
        new Date(`${batch.expected_harvest_on}T00:00:00`).getTime() <=
          plannerHarvestWindow &&
        new Date(`${batch.expected_harvest_on}T00:00:00`).getTime() >=
          plannerToday,
    ).length,
    overdue: cropTasks.filter(
      (task) => !task.completed && task.due_on < today(),
    ).length,
  };
  const reportEntries = entries.filter((entry) =>
    entry.occurred_on.startsWith(reportMonth),
  );
  const reportSales = reportEntries
    .filter((entry) => entry.kind === "sale")
    .reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
  const reportExpense = reportEntries
    .filter((entry) => entry.kind === "expense" || entry.kind === "labor")
    .reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
  const reportCrops = [
    ...new Set(reportEntries.map((entry) => entry.crop).filter(Boolean)),
  ] as string[];
  const reportMembers = (() => {
    const members = new Map<
      string,
      { hours: number; travel: number; investment: number }
    >();
    const getMember = (name: string) => {
      const key = name.trim() || "Unassigned";
      if (!members.has(key))
        members.set(key, { hours: 0, travel: 0, investment: 0 });
      return members.get(key)!;
    };
    reportEntries
      .filter((entry) => entry.kind === "labor")
      .forEach((entry) => {
        const name =
          entry.note?.match(/Member:\s*([^|]+)/i)?.[1] ?? "Unassigned";
        const item = getMember(name);
        item.hours += Number(entry.quantity ?? 0);
        item.travel += transportFromNote(entry.note);
      });
    investments.forEach((investment) => {
      getMember(investment.member).investment += investment.amount;
    });
    return [...members.entries()]
      .map(([name, totals]) => ({ name, ...totals }))
      .sort((a, b) => b.investment + b.hours - (a.investment + a.hours));
  })();
  const capitalTotal = investments
    .filter((item) => item.type === "Capital")
    .reduce((total, item) => total + item.amount, 0);
  const text = interfaceText[language];
  const labor = laborText[language];
  const common = commonText[language];
  const changeView = (next: View) => {
    setEditing(null);
    setEditingBatch(null);
    setEditingTask(null);
    setNotice("");
    setView(next);
  };
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    window.localStorage.setItem("hatake-hishab-language", next);
  };

  return (
    <main className="finance-app">
      <aside className="finance-sidebar">
        <div className="finance-brand">
          <div className="finance-logo">🌱</div>
          <div>
            <h1>Hatake Hishab</h1>
            <small>畑 হিসাব • Farm Ledger</small>
          </div>
        </div>
        <div className="pro-userbox">
          <b>{email}</b>
          <span>{farm.name}</span>
          <span>{farm.role.replace("_", " ")}</span>
        </div>
        <nav className="finance-nav">
          {views.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => changeView(item.id)}
            >
              <span>{item.icon}</span>
              {labels[language][item.id]}
            </button>
          ))}
        </nav>
        <div className="side-note">
          <b>লক্ষ্য:</b> বীজ, সার, টুলস, যাতায়াত, শ্রমঘণ্টা, ফসল সংগ্রহ এবং
          বিক্রি—সবকিছুর হিসাব এক জায়গায় রাখা।
        </div>
        <button className="logout" onClick={() => supabase.auth.signOut()}>
          {text.signOut}
        </button>
      </aside>
      <section className="finance-main">
        <header className="finance-topbar">
          <h3>{text.community}</h3>
          <div>
            <select
              className="language-select"
              value={language}
              onChange={(event) =>
                changeLanguage(event.target.value as Language)
              }
              aria-label="Language"
            >
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
            <button className="finance-button secondary" onClick={exportCsv}>
              {text.export}
            </button>
            <button
              className="finance-button"
              onClick={() => changeView("expense")}
            >
              {text.expense}
            </button>
            <button
              className="finance-button secondary"
              onClick={() => void supabase.auth.signOut()}
            >
              {text.signOut}
            </button>
          </div>
        </header>
        {notice && <p className="finance-notice">{notice}</p>}

        {view === "dashboard" && (
          <>
            <section className="finance-hero">
              <span>Started farming • 2026</span>
              <h2>{text.hero}</h2>
              <p>{text.heroText}</p>
            </section>
            <section className="metric-grid">
              <Metric
                label="মোট খরচ"
                value={yen(summary.expense)}
                note="Tools + seed + fertilizer + labor"
              />
              <Metric
                label="মোট বিক্রি"
                value={yen(summary.sales)}
                note="Harvested crops sold"
              />
              <Metric
                label="Net Profit / Loss"
                value={yen(summary.sales - summary.expense)}
                note="Sales − expense"
              />
              <Metric
                label="Cost / harvested kg"
                value={costPerKg}
                note={`${summary.harvest} kg recorded harvest`}
              />
            </section>
            <section className="dashboard-two">
              <article className="finance-card">
                <SectionTitle
                  title="মাসভিত্তিক খরচ বনাম বিক্রি"
                  detail="Expense · Sales"
                />
                <div className="mini-chart">
                  {monthly.map((month) => (
                    <div className="chart-month" key={month.label}>
                      <div className="chart-bars">
                        <i
                          className="bar expense"
                          style={{
                            height: `${Math.max(4, (month.expense / maxChart) * 100)}%`,
                          }}
                        />
                        <i
                          className="bar sale"
                          style={{
                            height: `${Math.max(4, (month.sales / maxChart) * 100)}%`,
                          }}
                        />
                      </div>
                      <span>{month.label}</span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="finance-card">
                <SectionTitle title="খরচের বিভাগ" detail="Current data" />
                <div className="expense-mix">
                  {expenseMix.length ? (
                    expenseMix.slice(0, 7).map(([category, amount]) => (
                      <div className="expense-progress" key={category}>
                        <div>
                          <span>
                            {category === laborCategory && laborTravel
                              ? `${category} — wages ${yen(amount - laborTravel)} + travel ${yen(laborTravel)}`
                              : category}
                          </span>
                          <b>{yen(amount)}</b>
                        </div>
                        <i>
                          <em
                            style={{
                              width: `${(amount / maxExpenseMix) * 100}%`,
                            }}
                          />
                        </i>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No expense records yet.</p>
                  )}
                </div>
              </article>
            </section>
            <section className="finance-card crop-sales-card">
              <SectionTitle title="ফসল অনুযায়ী আয়" detail="Sales value" />
              <div className="crop-sales-grid">
                {cropSales.length ? (
                  cropSales.slice(0, 6).map(([crop, amount]) => (
                    <article key={crop}>
                      <h3>{crop}</h3>
                      <b>{yen(amount)}</b>
                      <span>Recorded sales</span>
                    </article>
                  ))
                ) : (
                  <p className="empty-copy">No sales recorded yet.</p>
                )}
              </div>
            </section>
            <section className="dashboard-two pro-status-grid">
              <article className="finance-card">
                <SectionTitle title="Open Orders" detail="Customer demand" />
                <div className="dashboard-alert-list">
                  {openOrders.length ? (
                    openOrders.slice(0, 5).map((order) => (
                      <div className="crop-row" key={order.id}>
                        <span>
                          <b>
                            {order.crop || "Crop"} · {order.quantity ?? "—"}
                          </b>
                          <small>
                            {order.customer_name} ·{" "}
                            {new Date(order.created_at).toLocaleDateString()}
                          </small>
                        </span>
                        <span className="entry-badge sale">{order.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No open orders.</p>
                  )}
                </div>
              </article>
              <article className="finance-card">
                <SectionTitle title="Low Stock Alerts" detail="Need to buy" />
                <div className="dashboard-alert-list">
                  {lowStock.length ? (
                    lowStock.slice(0, 5).map((item) => (
                      <div className="crop-row" key={item.id}>
                        <span>
                          <b>{item.name}</b>
                          <small>
                            Stock: {item.quantity} {item.unit} · Reorder ≤ 2
                          </small>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No low-stock alerts.</p>
                  )}
                </div>
              </article>
            </section>
            <section className="dashboard-two">
              <article className="finance-card">
                <SectionTitle
                  title="সাম্প্রতিক লেনদেন"
                  detail="Last 8 entries"
                />
                <EntriesTable
                  entries={entries.slice(0, 8)}
                  busy={busy}
                  onDelete={deleteEntry}
                />
              </article>
              <article className="finance-card">
                <SectionTitle title="Farm summary" detail="Current data" />
                <div className="summary-list">
                  <p>
                    <span>Sales records</span>
                    <b>
                      {entries.filter((entry) => entry.kind === "sale").length}
                    </b>
                  </p>
                  <p>
                    <span>Expense records</span>
                    <b>
                      {
                        entries.filter((entry) => entry.kind === "expense")
                          .length
                      }
                    </b>
                  </p>
                  <p>
                    <span>Harvest entries</span>
                    <b>
                      {
                        entries.filter((entry) => entry.kind === "harvest")
                          .length
                      }
                    </b>
                  </p>
                  <p>
                    <span>Latest balance</span>
                    <b>{yen(summary.sales - summary.expense)}</b>
                  </p>
                </div>
              </article>
            </section>
            <section className="dashboard-two care-schedule">
              <article className="finance-card">
                <SectionTitle
                  title="Farm care schedule"
                  detail="Fertilizer · insect medicine · harvest"
                />
                <form className="finance-form" onSubmit={saveCareAlert}>
                  <label>
                    Action
                    <select name="type" defaultValue="Fertilizer">
                      <option>Fertilizer</option>
                      <option>Insect medicine</option>
                      <option>Harvest</option>
                    </select>
                  </label>
                  <label>
                    Due date
                    <input
                      name="due_on"
                      type="date"
                      defaultValue={today()}
                      required
                    />
                  </label>
                  <label>
                    Crop / ফসল
                    <select name="crop" defaultValue="">
                      <option value="">General / all crops</option>
                      {crops.map((crop) => (
                        <option key={crop}>{crop}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Note
                    <input
                      name="note"
                      placeholder="Product, dose, field, or harvest plan"
                    />
                  </label>
                  <button className="finance-button full">
                    Schedule alert
                  </button>
                </form>
                <button
                  className="finance-button secondary alert-enable"
                  onClick={() => void enableBrowserAlerts()}
                >
                  Enable browser alerts
                </button>
              </article>
              <article className="finance-card">
                <SectionTitle
                  title="Upcoming farm alerts"
                  detail={`${careAlerts.filter((alert) => alert.due_on <= today()).length} due now`}
                />
                <div className="care-list">
                  {careAlerts.length ? (
                    careAlerts.map((alert) => (
                      <div
                        className={
                          alert.due_on <= today() ? "care-row due" : "care-row"
                        }
                        key={alert.id}
                      >
                        <div>
                          <b>{alert.type}</b>
                          <span>
                            {alert.due_on} · {alert.crop || "General"}
                          </span>
                          <small>{alert.note || "No note"}</small>
                        </div>
                        <button
                          className="table-delete"
                          onClick={() => removeCareAlert(alert.id)}
                        >
                          Done
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">No farm-care alerts scheduled.</p>
                  )}
                </div>
              </article>
            </section>
          </>
        )}

        {entryView && (
          <section className="entry-page">
            <article className="finance-card entry-card">
              <SectionTitle
                title={pageTitle}
                detail={
                  view === "sales"
                    ? "Crop + customer + channel"
                    : view === "harvest"
                      ? "Production and wastage"
                      : "Expense + payment details"
                }
              />
              <form
                className="finance-form"
                onSubmit={saveEntry}
                key={editing?.id ?? "new"}
              >
                <input type="hidden" name="kind" value={selectedKind} />
                <label>
                  {common.date}
                  <input
                    name="date"
                    type="date"
                    defaultValue={editing?.occurred_on ?? today()}
                    required
                  />
                </label>
                <label>
                  {view === "expense" ? common.category : common.crop}
                  {view === "expense" ? (
                    <select
                      name="crop"
                      required
                      defaultValue={editing?.crop ?? ""}
                    >
                      <option value="" disabled>
                        {language === "ja"
                          ? "カテゴリーを選択"
                          : language === "bn"
                            ? "বিভাগ নির্বাচন করুন"
                            : "Select category"}
                      </option>
                      {cropOptions(expenseCategories).map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      name="crop"
                      required
                      defaultValue={editing?.crop ?? ""}
                    >
                      <option value="" disabled>
                        {language === "ja"
                          ? "作物を選択"
                          : language === "bn"
                            ? "ফসল নির্বাচন করুন"
                            : "Select crop"}
                      </option>
                      {cropOptions(crops).map((crop) => (
                        <option key={crop} value={crop}>
                          {crop}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label>
                  {view === "harvest"
                    ? `${common.amount} (${language === "ja" ? "任意" : language === "bn" ? "ঐচ্ছিক" : "optional"})`
                    : common.amount}
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    required={view !== "harvest"}
                    defaultValue={editing?.amount ?? ""}
                  />
                </label>
                <label>
                  {view === "expense"
                    ? `${common.quantity} (${language === "ja" ? "任意" : language === "bn" ? "ঐচ্ছিক" : "optional"})`
                    : common.quantity}
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    required={view === "sales" || view === "harvest"}
                    defaultValue={editing?.quantity ?? ""}
                  />
                </label>
                <label>
                  {common.unit}
                  <input
                    name="unit"
                    placeholder="kg / pcs / hours"
                    defaultValue={editing?.unit ?? ""}
                  />
                </label>
                {view === "expense" && (
                  <label>
                    Paid by
                    <input
                      name="paid_by"
                      placeholder="Hossain / Rafi"
                      list="known-holders"
                      defaultValue={editField("Paid by")}
                    />
                    <datalist id="known-holders">
                      {knownHolders.map((holder) => (
                        <option key={holder} value={holder} />
                      ))}
                    </datalist>
                  </label>
                )}
                {view === "sales" && (
                  <>
                    <label>
                      Customer
                      <input
                        name="customer"
                        placeholder="Community / Restaurant"
                        defaultValue={editField("Customer")}
                      />
                    </label>
                    <label>
                      Channel
                      <select
                        name="channel"
                        defaultValue={editing ? editField("Channel") : "Direct"}
                      >
                        <option value="">—</option>
                        <option>Community</option>
                        <option>WhatsApp</option>
                        <option>Facebook</option>
                        <option>Direct</option>
                        <option>Restaurant</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label>
                      Payment
                      <select
                        name="payment"
                        defaultValue={editing ? editField("Payment") : "Paid"}
                      >
                        <option value="">—</option>
                        <option>Paid</option>
                        <option>Pending</option>
                      </select>
                    </label>
                    <label>
                      {language === "bn"
                        ? "টাকা কার কাছে"
                        : language === "ja"
                          ? "代金の保管者"
                          : "Cash with"}
                      <input
                        name="cash_with"
                        list="known-holders"
                        placeholder="Shakhawat / Rafi"
                        defaultValue={editField("Cash with")}
                      />
                      <datalist id="known-holders">
                        {knownHolders.map((holder) => (
                          <option key={holder} value={holder} />
                        ))}
                      </datalist>
                    </label>
                  </>
                )}
                {view === "harvest" && (
                  <>
                    <label>
                      Sellable quantity
                      <input
                        name="sellable"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editField("Sellable")}
                      />
                    </label>
                    <label>
                      Waste quantity
                      <input
                        name="waste"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={editField("Waste")}
                      />
                    </label>
                  </>
                )}
                <label className="full">
                  {common.note}
                  <input
                    name="note"
                    placeholder="Customer, supplier, quality, delivery or task"
                    defaultValue={freeNote(editing?.note)}
                  />
                </label>
                <button className="finance-button full" disabled={busy}>
                  {editing ? "Update record" : common.save}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="finance-button secondary full"
                    onClick={() => setEditing(null)}
                  >
                    Cancel edit
                  </button>
                )}
              </form>
              {view === "sales" && (
                <>
                  <SectionTitle
                    title={
                      language === "bn"
                        ? "টাকা কার কাছে আছে"
                        : language === "ja"
                          ? "現金の保管者"
                          : "Cash in hand"
                    }
                    detail="Collected − spent"
                  />
                  <div className="summary-list">
                    {cashInHand.length ? (
                      cashInHand.map((holder) => (
                        <p className="crop-row" key={holder.name}>
                          <span>
                            <b>{holder.name}</b>
                            <small>
                              collected {yen(holder.collected)} · spent{" "}
                              {yen(holder.spent)}
                            </small>
                          </span>
                          <b>{yen(holder.balance)}</b>
                        </p>
                      ))
                    ) : (
                      <p className="empty-copy">No paid sales yet.</p>
                    )}
                    {untrackedSpend > 0 && (
                      <p>
                        <span>Expenses with no “Paid by” recorded</span>
                        <b>−{yen(untrackedSpend)}</b>
                      </p>
                    )}
                    {pendingSales > 0 && (
                      <p>
                        <span>Not collected yet (Pending)</span>
                        <b>{yen(pendingSales)}</b>
                      </p>
                    )}
                    {untaggedSales > 0 && (
                      <p>
                        <span>Older sales without payment status</span>
                        <b>{yen(untaggedSales)}</b>
                      </p>
                    )}
                  </div>
                </>
              )}
            </article>
            <article className="finance-card">
              <SectionTitle
                title={`${labels[language][view]} ${language === "ja" ? "詳細" : language === "bn" ? "বিবরণ" : "details"}`}
                detail={common.records}
              />
              <EntriesTable
                entries={displayedEntries}
                busy={busy}
                onDelete={deleteEntry}
                onEdit={startEdit}
                editingId={editing?.id}
              />
            </article>
          </section>
        )}

        {view === "labor" && (
          <section className="entry-page">
            <article className="finance-card entry-card">
              <SectionTitle title={labor.title} detail={labor.detail} />
              <form
                className="finance-form"
                onSubmit={saveLabor}
                key={editing?.id ?? "new"}
              >
                <label>
                  {labor.date}
                  <input
                    name="date"
                    type="date"
                    defaultValue={editing?.occurred_on ?? today()}
                    required
                  />
                </label>
                <label>
                  {labor.member}
                  <input
                    name="member"
                    required
                    list="known-holders"
                    defaultValue={editField("Member")}
                    placeholder={
                      language === "ja"
                        ? "ラフィ / イスティアク / ファルハン"
                        : "Rafi / Ishtiaq / Farhan"
                    }
                  />
                  <datalist id="known-holders">
                    {knownHolders.map((holder) => (
                      <option key={holder} value={holder} />
                    ))}
                  </datalist>
                </label>
                <label>
                  {labor.hours}
                  <input
                    name="hours"
                    type="number"
                    min="0"
                    step="0.25"
                    required
                    placeholder="5"
                    defaultValue={editing?.quantity ?? ""}
                  />
                </label>
                <label>
                  {labor.rate}
                  <input
                    name="rate"
                    type="number"
                    min="0"
                    defaultValue={editing ? editedRate : "0"}
                  />
                </label>
                <label>
                  {labor.transport}
                  <input
                    name="transport"
                    type="number"
                    min="0"
                    defaultValue={
                      editing ? transportFromNote(editing.note) : "0"
                    }
                  />
                </label>
                <label>
                  {labor.crop}
                  <select name="crop" defaultValue={editing?.crop ?? ""}>
                    <option value="">
                      {language === "ja"
                        ? "一般"
                        : language === "bn"
                          ? "সাধারণ"
                          : "General"}
                    </option>
                    {cropOptions(crops).map((crop) => (
                      <option key={crop}>{crop}</option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  {labor.task}
                  <input
                    name="task"
                    defaultValue={editField("Task")}
                    placeholder={
                      language === "ja"
                        ? "除草 / 植え付け / 収穫 / 配送"
                        : language === "bn"
                          ? "আগাছা পরিষ্কার / রোপণ / সংগ্রহ / ডেলিভারি"
                          : "Weeding / planting / harvesting / delivery"
                    }
                  />
                </label>
                <button className="finance-button full" disabled={busy}>
                  {editing ? "Update record" : labor.save}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="finance-button secondary full"
                    onClick={() => setEditing(null)}
                  >
                    Cancel edit
                  </button>
                )}
              </form>
            </article>
            <article className="finance-card">
              <SectionTitle title={labor.records} detail={labor.saved} />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>{labor.date}</th>
                      <th>{labor.hours}</th>
                      <th>{labor.crop}</th>
                      <th>{labor.cost}</th>
                      <th>
                        {labor.member} / {labor.task}
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedEntries.length ? (
                      displayedEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.occurred_on}</td>
                          <td>{entry.quantity ?? 0} h</td>
                          <td>
                            {entry.crop ||
                              (language === "ja"
                                ? "一般"
                                : language === "bn"
                                  ? "সাধারণ"
                                  : "General")}
                          </td>
                          <td>{yen(Number(entry.amount ?? 0))}</td>
                          <td>{entry.note || "—"}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="table-edit"
                                disabled={busy}
                                onClick={() => startEdit(entry)}
                              >
                                {editing?.id === entry.id ? "Editing…" : "Edit"}
                              </button>
                              <button
                                className="table-delete"
                                disabled={busy}
                                onClick={() => void deleteEntry(entry.id)}
                              >
                                {labor.remove}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>{labor.none}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {view === "batches" && (
          <section className="entry-page">
            <div className="report-metrics planner-metrics">
              <Metric
                label="Active crop batches"
                value={String(plannerStats.active)}
                note="Currently in the field"
              />
              <Metric
                label="Tasks next 7 days"
                value={String(plannerStats.nextWeek)}
                note="Fertilizer, weeding, checks"
              />
              <Metric
                label="Harvest coming"
                value={String(plannerStats.harvestSoon)}
                note="Expected within 14 days"
              />
              <Metric
                label="Overdue tasks"
                value={String(plannerStats.overdue)}
                note="Need attention"
              />
            </div>
            <article className="finance-card entry-card">
              <SectionTitle
                title={labels[language].batches}
                detail={
                  editingBatch
                    ? `Editing ${editingBatch.code}`
                    : "Planting and growth tracking"
                }
              />
              <form
                className="finance-form"
                onSubmit={saveBatch}
                key={editingBatch?.id ?? "new"}
              >
                {editingBatch && (
                  <p className="small-pro full">
                    Editing <b>{editingBatch.code}</b>. The batch code and its
                    planned tasks stay as they are.
                  </p>
                )}
                <label>
                  {common.crop}
                  <select
                    name="crop"
                    required
                    defaultValue={editingBatch?.crop ?? ""}
                  >
                    <option value="" disabled>
                      Select crop
                    </option>
                    {withOption(crops, editingBatch?.crop).map((crop) => (
                      <option key={crop}>{crop}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Variety / 品種
                  <input
                    name="variety"
                    placeholder="Optional variety name"
                    defaultValue={editingBatch?.variety ?? ""}
                  />
                </label>
                <label>
                  Field / Bed
                  <input
                    name="bed"
                    required
                    placeholder="A1 / North-02"
                    defaultValue={editingBatch?.bed ?? ""}
                  />
                </label>
                <label>
                  Planted / Transplanted date
                  <input
                    name="planted_on"
                    type="date"
                    defaultValue={editingBatch?.planted_on ?? today()}
                    required
                  />
                </label>
                <label>
                  Expected harvest date
                  <input
                    name="expected_harvest_on"
                    type="date"
                    defaultValue={editingBatch?.expected_harvest_on ?? ""}
                  />
                </label>
                <label>
                  Area (㎡)
                  <input
                    name="area"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue={editingBatch?.area ?? ""}
                  />
                </label>
                <label>
                  Plants / rows
                  <input
                    name="plants"
                    type="number"
                    min="0"
                    defaultValue={editingBatch?.plants ?? ""}
                  />
                </label>
                <label>
                  Responsible member
                  <input
                    name="responsible_member"
                    placeholder="Rafi / Ishtiaq / Farhan"
                    list="known-holders"
                    defaultValue={editingBatch?.responsible_member ?? ""}
                  />
                  <datalist id="known-holders">
                    {knownHolders.map((holder) => (
                      <option key={holder} value={holder} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Current stage
                  <select
                    name="stage"
                    defaultValue={editingBatch?.stage ?? "Planted"}
                  >
                    {withOption(batchStages, editingBatch?.stage).map(
                      (stage) => (
                        <option key={stage}>{stage}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="full">
                  Note
                  <input
                    name="note"
                    placeholder="Mulch, trellis, seed source, special condition…"
                    defaultValue={editingBatch?.note ?? ""}
                  />
                </label>
                <button className="finance-button full" disabled={busy}>
                  {editingBatch
                    ? "Update batch"
                    : "Create batch + generate schedule"}
                </button>
                {editingBatch && (
                  <button
                    type="button"
                    className="finance-button secondary full"
                    onClick={() => setEditingBatch(null)}
                  >
                    Cancel edit
                  </button>
                )}
              </form>
            </article>
            <article className="finance-card planner-guide">
              <SectionTitle
                title="Crop List / ফসলের তালিকা"
                detail={`${crops.length - 1} available crops`}
              />
              <div className="crop-list-grid">
                {crops
                  .filter((crop) => crop !== "Other")
                  .map((crop) => (
                    <span key={crop} className="crop-list-chip">
                      {crop}
                    </span>
                  ))}
              </div>
            </article>
            <article className="finance-card planner-guide">
              <SectionTitle
                title="Crop Code Standard"
                detail="Use the same crop code everywhere"
              />
              <div className="crop-code-grid">
                {cropCodeGuide.map(([code, bangla, english]) => (
                  <div key={code} className="crop-code-card">
                    <b>{code}</b>
                    <span>{bangla}</span>
                    <small>{english}</small>
                  </div>
                ))}
              </div>
              <p className="small-pro">
                <b>Recommended:</b> use the batch code on Expense, Labor,
                Harvest and Sales records. Then the app can calculate exact cost
                and profit for each planting.
              </p>
            </article>
            <article className="finance-card entry-card">
              <SectionTitle
                title={editingTask ? "Edit Farm Task" : "Add Custom Farm Task"}
                detail={editingTask ? "Saved task" : "For exceptional work"}
              />
              {batches.length ? (
                <form
                  className="finance-form"
                  onSubmit={saveCropTask}
                  key={editingTask?.id ?? "new"}
                >
                  <label>
                    Batch
                    <select
                      name="batch_id"
                      required
                      defaultValue={editingTask?.batch_id ?? ""}
                    >
                      <option value="" disabled>
                        Select batch
                      </option>
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.code} · {batch.crop}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Task type
                    <select
                      name="task_type"
                      defaultValue={editingTask?.task_type ?? "Fertilizer"}
                    >
                      {withOption(taskTypes, editingTask?.task_type).map(
                        (type) => (
                          <option key={type}>{type}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Due date
                    <input
                      name="due_on"
                      type="date"
                      defaultValue={editingTask?.due_on ?? today()}
                      required
                    />
                  </label>
                  <label>
                    Responsible
                    <input
                      name="responsible_member"
                      placeholder="Hossain"
                      list="known-holders"
                      defaultValue={editingTask?.responsible_member ?? ""}
                    />
                  </label>
                  <label className="full">
                    Instruction
                    <input
                      name="instruction"
                      placeholder="What exactly should be done?"
                      defaultValue={editingTask?.instruction ?? ""}
                    />
                  </label>
                  <button className="finance-button" disabled={busy}>
                    {editingTask ? "Update task" : "Add task"}
                  </button>
                  {editingTask && (
                    <button
                      type="button"
                      className="finance-button secondary"
                      onClick={() => setEditingTask(null)}
                    >
                      Cancel edit
                    </button>
                  )}
                </form>
              ) : (
                <p className="small-pro">
                  Create a crop batch first, then add its farm tasks here.
                </p>
              )}
            </article>
            <article className="finance-card">
              <SectionTitle
                title="Planned Farm Tasks"
                detail={`${cropTasks.filter((task) => !task.completed).length} open`}
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Due</th>
                      <th>Batch</th>
                      <th>Task</th>
                      <th>Instruction</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cropTasks.length ? (
                      cropTasks.map((task) => {
                        const batch = batches.find(
                          (item) => item.id === task.batch_id,
                        );
                        return (
                          <tr key={task.id}>
                            <td>{task.due_on}</td>
                            <td>{batch ? batch.code : "—"}</td>
                            <td>{task.task_type}</td>
                            <td>{task.instruction || "—"}</td>
                            <td>
                              <span
                                className={`entry-badge ${task.completed ? "" : "harvest"}`}
                              >
                                {task.completed ? "Done" : "Open"}
                              </span>
                            </td>
                            <td className="table-actions">
                              <button
                                type="button"
                                className="table-edit"
                                disabled={busy}
                                onClick={() => startTaskEdit(task)}
                              >
                                {editingTask?.id === task.id
                                  ? "Editing…"
                                  : "Edit"}
                              </button>
                              <button
                                type="button"
                                className="table-edit"
                                disabled={busy}
                                onClick={() => void completeCropTask(task)}
                              >
                                {task.completed ? "Reopen" : "Done"}
                              </button>
                              <button
                                type="button"
                                className="table-delete"
                                disabled={busy}
                                onClick={() => void deleteCropTask(task.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6}>No planned tasks yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
            <article className="finance-card">
              <SectionTitle
                title={labels[language].batches}
                detail={`${batches.length} saved · ${cropTasks.filter((task) => !task.completed).length} tasks open`}
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>{common.crop}</th>
                      <th>{common.status}</th>
                      <th>Planted</th>
                      <th>Expected harvest</th>
                      <th>Field · member</th>
                      <th>Tasks open</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length ? (
                      batches.map((batch) => {
                        const openTasks = cropTasks.filter(
                          (task) =>
                            task.batch_id === batch.id && !task.completed,
                        ).length;
                        return (
                          <tr key={batch.id}>
                            <td>
                              <b>{batch.code}</b>
                            </td>
                            <td>
                              {batch.crop}
                              {batch.variety ? ` · ${batch.variety}` : ""}
                            </td>
                            <td>
                              <span className="entry-badge harvest">
                                {batch.stage}
                              </span>
                            </td>
                            <td>{batch.planted_on || "—"}</td>
                            <td>{batch.expected_harvest_on || "—"}</td>
                            <td>
                              {[batch.bed, batch.responsible_member]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </td>
                            <td>{openTasks || "—"}</td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-edit"
                                  disabled={busy}
                                  onClick={() => startBatchEdit(batch)}
                                >
                                  {editingBatch?.id === batch.id
                                    ? "Editing…"
                                    : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  className="table-delete"
                                  disabled={busy}
                                  onClick={() => void deleteBatch(batch.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8}>No crop batches yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {view === "orders" && (
          <section className="entry-page">
            <article className="finance-card">
              <SectionTitle
                title="Customers"
                detail="Contact list from saved orders"
              />
              <div className="crop-list">
                {customerNames.length ? (
                  customerNames.map((customer) => {
                    const customerOrders = orders.filter(
                      (order) => order.customer_name === customer,
                    );
                    return (
                      <div className="crop-row" key={customer}>
                        <span>
                          <b>{customer}</b>
                          <small>
                            {customerOrders.length} order
                            {customerOrders.length === 1 ? "" : "s"}
                          </small>
                        </span>
                        <b>
                          {
                            customerOrders.filter(
                              (order) =>
                                !["delivered", "cancelled"].includes(
                                  order.status,
                                ),
                            ).length
                          }{" "}
                          open
                        </b>
                      </div>
                    );
                  })
                ) : (
                  <p className="empty-copy">
                    Add an order to create your first customer record.
                  </p>
                )}
              </div>
            </article>
            <article className="finance-card entry-card">
              <SectionTitle title="Orders" detail="Order → delivery" />
              <form className="finance-form" onSubmit={saveOrder}>
                <label>
                  {common.customer}
                  <input
                    name="customer_name"
                    required
                    placeholder="Community Buyers"
                    list="saved-customers"
                  />
                  <datalist id="saved-customers">
                    {customerNames.map((customer) => (
                      <option key={customer} value={customer} />
                    ))}
                  </datalist>
                </label>
                <label>
                  {common.crop}
                  <select name="crop" defaultValue="">
                    <option value="">Select crop</option>
                    {crops.map((crop) => (
                      <option key={crop}>{crop}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input name="quantity" type="number" min="0" step="0.01" />
                </label>
                <label>
                  Status
                  <select name="status" defaultValue="new">
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="packed">Packed</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <button className="finance-button full" disabled={busy}>
                  Save order
                </button>
              </form>
            </article>
            <article className="finance-card">
              <SectionTitle
                title={labels[language].orders}
                detail={`${orders.length} saved`}
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>{common.customer}</th>
                      <th>{common.crop}</th>
                      <th>{common.quantity}</th>
                      <th>{common.status}</th>
                      <th>{common.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length ? (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.customer_name}</td>
                          <td>{order.crop || "—"}</td>
                          <td>{order.quantity ?? "—"}</td>
                          <td>
                            <span className="entry-badge sale">
                              {order.status}
                            </span>
                          </td>
                          <td>
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>No customer orders yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {view === "stock" && (
          <section className="entry-page">
            <article className="finance-card entry-card">
              <SectionTitle
                title={labels[language].stock}
                detail="Farm supplies and inventory"
              />
              <form className="finance-form" onSubmit={saveInventory}>
                <label>
                  Item name
                  <input name="name" required placeholder="NPK 16-16-16" />
                </label>
                <label>
                  Category
                  <input
                    name="category"
                    placeholder="Fertilizer, seed, packaging…"
                  />
                </label>
                <label>
                  Quantity
                  <input
                    name="quantity"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </label>
                <label>
                  Unit
                  <input
                    name="unit"
                    defaultValue="pcs"
                    placeholder="kg / L / pcs"
                  />
                </label>
                <button className="finance-button full" disabled={busy}>
                  Save stock item
                </button>
              </form>
            </article>
            <article className="finance-card">
              <SectionTitle
                title={labels[language].stock}
                detail={`${inventory.length} items`}
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>{common.item}</th>
                      <th>{common.category}</th>
                      <th>{common.quantity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.length ? (
                      inventory.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.category || "—"}</td>
                          <td>
                            <b>
                              {item.quantity} {item.unit}
                            </b>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No stock items yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {view === "investment" && (
          <section className="entry-page">
            <article className="finance-card entry-card">
              <SectionTitle
                title={labels[language].investment}
                detail="Who paid how much"
              />
              <form className="finance-form" onSubmit={saveInvestment}>
                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    defaultValue={today()}
                    required
                  />
                </label>
                <label>
                  Member
                  <input
                    name="member"
                    required
                    placeholder="Hossain / Rafi / Ishtiaq"
                  />
                </label>
                <label>
                  Amount (¥)
                  <input name="amount" type="number" min="0" required />
                </label>
                <label>
                  Type
                  <select name="type" defaultValue="Capital">
                    <option>Capital</option>
                    <option>Loan</option>
                    <option>Donation</option>
                  </select>
                </label>
                <label className="full">
                  Note
                  <input
                    name="note"
                    placeholder="Initial capital, purchase support…"
                  />
                </label>
                <button className="finance-button full">Save investment</button>
              </form>
              <div className="finance-table-wrap investment-table">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Note</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {investments.length ? (
                      investments.map((item) => (
                        <tr key={item.id}>
                          <td>{item.date}</td>
                          <td>{item.member}</td>
                          <td>{yen(item.amount)}</td>
                          <td>
                            <span className="entry-badge sale">
                              {item.type}
                            </span>
                          </td>
                          <td>{item.note || "—"}</td>
                          <td>
                            <button
                              className="table-delete"
                              onClick={() => removeInvestment(item.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>No investment records yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
            <article className="finance-card">
              <SectionTitle
                title={
                  language === "ja"
                    ? "利益分配プレビュー"
                    : language === "bn"
                      ? "লাভ বণ্টনের পূর্বরূপ"
                      : "Profit sharing preview"
                }
                detail="Based on capital share"
              />
              <div className="crop-list">
                {capitalTotal ? (
                  Object.entries(
                    investments
                      .filter((item) => item.type === "Capital")
                      .reduce<Record<string, number>>((all, item) => {
                        all[item.member] =
                          (all[item.member] ?? 0) + item.amount;
                        return all;
                      }, {}),
                  ).map(([member, amount]) => (
                    <div className="crop-row" key={member}>
                      <span>
                        <b>{member}</b>
                        <small>
                          {((amount / capitalTotal) * 100).toFixed(1)}% capital
                          share
                        </small>
                      </span>
                      <b>
                        {yen(
                          (Math.max(0, summary.sales - summary.expense) *
                            amount) /
                            capitalTotal,
                        )}
                      </b>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">
                    Add Capital investments to see the preview.
                  </p>
                )}
              </div>
              <p className="small-pro">
                Preview only. Confirm your team’s policy before distributing
                profit.
              </p>
            </article>
          </section>
        )}

        {view === "reports" && (
          <section className="finance-card report-page">
            <SectionTitle
              title={labels[language].reports}
              detail="Print / Save as PDF"
            />
            <div className="report-controls">
              <label>
                Report month
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(event) => setReportMonth(event.target.value)}
                />
              </label>
              <button
                className="finance-button secondary"
                onClick={() => void loadWorkspace()}
              >
                Refresh Report
              </button>
            </div>
            <div className="report-metrics">
              <Metric
                label="Month sales"
                value={yen(reportSales)}
                note={reportMonth}
              />
              <Metric
                label="Month expense"
                value={yen(reportExpense)}
                note="Including labor & travel"
              />
              <Metric
                label="Month profit"
                value={yen(reportSales - reportExpense)}
                note="Sales − expense"
              />
            </div>
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>{common.crop}</th>
                    <th>{labels[language].harvest}</th>
                    <th>{labels[language].sales}</th>
                    <th>Direct expense</th>
                    <th>Cost / kg</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCrops.length ? (
                    reportCrops.map((crop) => {
                      const rows = reportEntries.filter(
                        (entry) => entry.crop === crop,
                      );
                      const harvest = rows
                        .filter((entry) => entry.kind === "harvest")
                        .reduce(
                          (total, entry) => total + Number(entry.quantity ?? 0),
                          0,
                        );
                      const sales = rows
                        .filter((entry) => entry.kind === "sale")
                        .reduce(
                          (total, entry) => total + Number(entry.amount ?? 0),
                          0,
                        );
                      const expense = rows
                        .filter(
                          (entry) =>
                            entry.kind === "expense" || entry.kind === "labor",
                        )
                        .reduce(
                          (total, entry) => total + Number(entry.amount ?? 0),
                          0,
                        );
                      return (
                        <tr key={crop}>
                          <td>{crop}</td>
                          <td>{harvest} kg</td>
                          <td>{yen(sales)}</td>
                          <td>{yen(expense)}</td>
                          <td>{harvest ? yen(expense / harvest) : "—"}</td>
                          <td>{yen(sales - expense)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}>No records for this month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <section className="report-contributions">
              <SectionTitle
                title="Member Contribution"
                detail="Hours + investment"
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Hours</th>
                      <th>Travel</th>
                      <th>Investment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportMembers.length ? (
                      reportMembers.map((member) => (
                        <tr key={member.name}>
                          <td>{member.name}</td>
                          <td>{member.hours.toFixed(1)} h</td>
                          <td>{yen(member.travel)}</td>
                          <td>{yen(member.investment)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>No member contribution records yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {view === "settings" && (
          <section className="entry-page">
            <article className="finance-card settings-page">
              <SectionTitle
                title={
                  language === "ja"
                    ? "メンバーと役割"
                    : language === "bn"
                      ? "সদস্য ও ভূমিকা"
                      : "Members & Roles"
                }
                detail="Secure account access"
              />
              <div className="summary-list">
                <p>
                  <span>Signed-in member</span>
                  <b>{email}</b>
                </p>
                <p>
                  <span>Farm</span>
                  <b>{farm.name}</b>
                </p>
                <p>
                  <span>Role</span>
                  <b>{farm.role.replace("_", " ")}</b>
                </p>
              </div>
              {farm.role === "admin" ? (
                <form
                  className="finance-form member-form"
                  onSubmit={addFarmMember}
                >
                  <label className="full">
                    Member email
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="member@email.com"
                    />
                  </label>
                  <label>
                    Role
                    <select name="role" defaultValue="field_member">
                      <option value="admin">Admin</option>
                      <option value="accountant">Accountant</option>
                      <option value="field_member">Field Member</option>
                      <option value="sales">Sales</option>
                    </select>
                  </label>
                  <button className="finance-button" disabled={busy}>
                    Add Member
                  </button>
                </form>
              ) : (
                <p className="small-pro">
                  Only an Admin can add members or change roles.
                </p>
              )}
              <p className="small-pro">
                If the email has not registered yet, a pending invitation is
                saved. It will link automatically after they create an account
                with the same email address.
              </p>
            </article>
            <article className="finance-card settings-page">
              <SectionTitle
                title={
                  language === "ja"
                    ? "バックアップと出力"
                    : language === "bn"
                      ? "ব্যাকআপ ও এক্সপোর্ট"
                      : "Backup & Export"
                }
                detail={labels[language].settings}
              />
              <p>
                Your records are securely stored in your farm workspace.
                Download a backup whenever you need it.
              </p>
              <div className="settings-actions">
                <button className="finance-button" onClick={exportCsv}>
                  Export all data as CSV
                </button>
                <button
                  className="finance-button secondary"
                  disabled={busy}
                  onClick={() => void import2026Workbook()}
                >
                  Import 2026 Expense & Sales workbook
                </button>
              </div>
              <p className="import-note">
                Imports 17 expenses and 9 sales from{" "}
                <b>AAA Hatake Cost Tracking.xlsx</b>. Eight source expenses have
                no date, so they are tagged and filed under 2026-01-01 for later
                correction.
              </p>
            </article>
          </section>
        )}
        <footer>Hatake Hishab • Community Farm Accounting • 2026</footer>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="finance-card metric">
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </article>
  );
}
function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="finance-section-title">
      <h2>{title}</h2>
      <span>{detail}</span>
    </div>
  );
}
function EntriesTable({
  entries,
  busy,
  onDelete,
  onEdit,
  editingId,
}: {
  entries: Entry[];
  busy: boolean;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (entry: Entry) => void;
  editingId?: string;
}) {
  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Crop / detail</th>
            <th>Amount</th>
            <th>Quantity</th>
            <th>Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.length ? (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.occurred_on}</td>
                <td>
                  <span className={`entry-badge ${entry.kind}`}>
                    {entry.kind}
                  </span>
                </td>
                <td>{entry.crop || "—"}</td>
                <td>
                  {entry.amount !== null ? yen(Number(entry.amount)) : "—"}
                </td>
                <td>
                  {entry.quantity !== null
                    ? `${entry.quantity} ${entry.unit ?? ""}`
                    : "—"}
                </td>
                <td>{entry.note || "—"}</td>
                <td>
                  <div className="table-actions">
                    {onEdit && (
                      <button
                        className="table-edit"
                        disabled={busy}
                        onClick={() => onEdit(entry)}
                      >
                        {editingId === entry.id ? "Editing…" : "Edit"}
                      </button>
                    )}
                    <button
                      className="table-delete"
                      disabled={busy}
                      onClick={() => void onDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>No records yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
