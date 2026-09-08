"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
type CashHandover = {
  id: string;
  occurred_on: string;
  from_holder: string;
  to_holder: string;
  amount: number;
  note: string | null;
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
// One crop line of a sale. Held as text because it comes straight from the
// inputs and stays empty until the member types.
type SaleLine = {
  id: number;
  crop: string;
  amount: string;
  quantity: string;
  unit: string;
};
// One expense line: category, amount, optional quantity and unit
type ExpenseLine = {
  id: number;
  category: string;
  amount: string;
  quantity: string;
  unit: string;
};
type ReportScope = "month" | "all";
type Language = "bn" | "en" | "ja";
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
  status: "draft" | "issued" | "sent" | "paid" | "overdue";
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
// "viewer" is the read-only role: every page stays visible, every form and
// delete button disappears. supabase/view-only-role.sql enforces the same rule
// in the database so the restriction is not just a hidden button.
type MemberRole = "admin" | "accountant" | "field_member" | "sales" | "viewer";
type View =
  | "dashboard"
  | "expense"
  | "sales"
  | "bills"
  | "summary"
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
  { id: "bills", label: "📄 Bills", icon: "📄" },
  { id: "summary", label: "📊 Summary", icon: "📊" },
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
    bills: "বিল",
    summary: "বিক্রি সারসংক্ষেপ",
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
    bills: "Bills",
    summary: "Sales Summary",
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
    bills: "請求書",
    summary: "販売サマリー",
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
const handoverText: Record<
  Language,
  {
    title: string;
    detail: string;
    from: string;
    to: string;
    amount: string;
    save: string;
    update: string;
    cancel: string;
    records: string;
    none: string;
    sameHolder: string;
    hint: string;
  }
> = {
  bn: {
    title: "টাকা হাতবদল",
    detail: "কার কাছ থেকে কার কাছে",
    from: "কার কাছ থেকে",
    to: "কার কাছে গেল",
    amount: "পরিমাণ (¥)",
    save: "হাতবদল সংরক্ষণ করুন",
    update: "হাতবদল আপডেট করুন",
    cancel: "সম্পাদনা বাতিল",
    records: "হাতবদলের রেকর্ড",
    none: "এখনো কোনো হাতবদল নেই।",
    sameHolder: "কার কাছ থেকে ও কার কাছে — দুই নাম আলাদা হতে হবে।",
    hint: "এটি খরচ নয় — শুধু টাকা কার কাছে আছে সেটা বদলায়।",
  },
  en: {
    title: "Cash handover",
    detail: "Who passed money to whom",
    from: "From",
    to: "To (member or bank)",
    amount: "Amount (¥)",
    save: "Save handover",
    update: "Update handover",
    cancel: "Cancel edit",
    records: "Handover records",
    none: "No handovers recorded yet.",
    sameHolder: "From and To must be two different names.",
    hint: "Not an expense — it only moves cash from one person to another.",
  },
  ja: {
    title: "現金の渡し",
    detail: "誰から誰へ",
    from: "渡し元",
    to: "渡し先（メンバー・銀行）",
    amount: "金額 (¥)",
    save: "渡しを保存",
    update: "渡しを更新",
    cancel: "編集を中止",
    records: "渡しの記録",
    none: "渡しの記録はまだありません。",
    sameHolder: "渡し元と渡し先には別の名前を入力してください。",
    hint: "経費ではありません。現金の保管者が変わるだけです。",
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
    selectHolder: string;
    newName: string;
    chooseFromList: string;
    paidBy: string;
    spentBy: string;
    selectCrop: string;
    newCrop: string;
    newCropName: string;
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
    selectHolder: "নাম নির্বাচন করুন",
    newName: "＋ নতুন নাম",
    chooseFromList: "তালিকা থেকে বেছে নিন",
    paidBy: "কে টাকা দিয়েছে",
    spentBy: "কে কত খরচ করেছে",
    selectCrop: "ফসল নির্বাচন করুন",
    newCrop: "＋ নতুন ফসল",
    newCropName: "নতুন ফসলের নাম",
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
    selectHolder: "Select a name",
    newName: "＋ New name",
    chooseFromList: "Choose from the list",
    paidBy: "Paid by",
    spentBy: "Who spent how much",
    selectCrop: "Select crop",
    newCrop: "＋ New crop",
    newCropName: "New crop name",
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
    selectHolder: "名前を選択",
    newName: "＋ 新しい名前",
    chooseFromList: "一覧から選ぶ",
    paidBy: "支払者",
    spentBy: "誰がいくら使ったか",
    selectCrop: "作物を選択",
    newCrop: "＋ 新しい作物",
    newCropName: "新しい作物名",
  },
};
// One customer usually buys several crops at once, so the sales form keeps a
// list of items and saves one row per crop under the same customer.
const salesText: Record<
  Language,
  {
    items: string;
    itemsHint: string;
    item: string;
    addItem: string;
    remove: string;
    total: string;
    itemsWord: string;
    itemWord: string;
    needItem: string;
    savedCount: string;
    bills: string;
    billsDetail: string;
    pending: string;
    customers: string;
    customersDetail: string;
    search: string;
    buyers: string;
    buyer: string;
    repeat: string;
    topBuyer: string;
    unpaid: string;
    visits: string;
    visit: string;
    lastBuy: string;
    mostBought: string;
    open: string;
    close: string;
    noCustomer: string;
    share: string;
    showAll: string;
    showTop: string;
  }
> = {
  bn: {
    items: "ফসলের আইটেম",
    itemsHint: "এই ক্রেতার সব ফসল একসাথে যোগ করুন, তারপর একবারেই সংরক্ষণ করুন।",
    item: "আইটেম",
    addItem: "＋ আরেকটি ফসল যোগ করুন",
    remove: "বাদ দিন",
    total: "সর্বমোট",
    itemsWord: "আইটেম",
    itemWord: "আইটেম",
    needItem: "অন্তত একটি ফসল ও তার দাম দিন।",
    savedCount: "টি বিক্রির রেকর্ড সংরক্ষিত হয়েছে।",
    bills: "কেনাকাটার হিসাব",
    billsDetail: "একই দিনের সব আইটেম একসাথে",
    pending: "বাকি আছে",
    customers: "ক্রেতা ড্যাশবোর্ড",
    customersDetail: "নাম অনুযায়ী সব কেনাকাটা এক জায়গায়",
    search: "ক্রেতার নাম খুঁজুন",
    buyers: "মোট ক্রেতা",
    buyer: "ক্রেতা",
    repeat: "বারবার কিনেছে",
    topBuyer: "সবচেয়ে বড় ক্রেতা",
    unpaid: "বাকি টাকা",
    visits: "বার কিনেছে",
    visit: "বার কিনেছে",
    lastBuy: "শেষ কেনা",
    mostBought: "সবচেয়ে বেশি কিনেছে",
    open: "বিস্তারিত দেখুন",
    close: "বন্ধ করুন",
    noCustomer: "এখনো কোনো ক্রেতার বিক্রি নেই।",
    share: "মোট বিক্রির অংশ",
    showAll: "সব ক্রেতা দেখুন",
    showTop: "শুধু সেরা ৮ জন",
  },
  en: {
    items: "Crop items",
    itemsHint: "Add every crop for this customer, then save once.",
    item: "Item",
    addItem: "＋ Add another crop",
    remove: "Remove",
    total: "Total",
    itemsWord: "items",
    itemWord: "item",
    needItem: "Add at least one crop with an amount.",
    savedCount: "sale records saved.",
    bills: "Purchases",
    billsDetail: "One line per day",
    pending: "Pending",
    customers: "Customer dashboard",
    customersDetail: "Every buyer, grouped by name",
    search: "Search a customer",
    buyers: "Customers",
    buyer: "customer",
    repeat: "Repeat buyers",
    topBuyer: "Top customer",
    unpaid: "Unpaid",
    visits: "purchases",
    visit: "purchase",
    lastBuy: "Last",
    mostBought: "Most bought",
    open: "Details",
    close: "Hide",
    noCustomer: "No customer sales recorded yet.",
    share: "share of sales",
    showAll: "Show all customers",
    showTop: "Show top 8 only",
  },
  ja: {
    items: "作物の明細",
    itemsHint: "同じ顧客の作物をすべて追加して、1回で保存します。",
    item: "明細",
    addItem: "＋ 作物を追加",
    remove: "削除",
    total: "合計",
    itemsWord: "件",
    itemWord: "件",
    needItem: "作物と金額を1件以上入力してください。",
    savedCount: "件の販売記録を保存しました。",
    bills: "購入履歴",
    billsDetail: "1日ごとに1行",
    pending: "未収",
    customers: "顧客ダッシュボード",
    customersDetail: "名前ごとにまとめた全顧客",
    search: "顧客を検索",
    buyers: "顧客数",
    buyer: "顧客",
    repeat: "再購入した顧客",
    topBuyer: "最上位の顧客",
    unpaid: "未収金",
    visits: "回購入",
    visit: "回購入",
    lastBuy: "最終購入",
    mostBought: "購入が多い作物",
    open: "詳細",
    close: "閉じる",
    noCustomer: "顧客の販売記録はまだありません。",
    share: "売上に占める割合",
    showAll: "すべての顧客を表示",
    showTop: "上位8件のみ表示",
  },
};
// The report answers two questions: how did one month go, and how is the farm
// doing overall? Both use the same sections, only the date window changes.
const reportText: Record<
  Language,
  {
    monthScope: string;
    allScope: string;
    monthDetail: string;
    allDetail: string;
    refresh: string;
    print: string;
    sales: string;
    expense: string;
    expenseHint: string;
    profit: string;
    loss: string;
    profitHint: string;
    harvest: string;
    costPerKg: string;
    costHint: string;
    pending: string;
    pendingHint: string;
    invested: string;
    investedHint: string;
    plTitle: string;
    plDetail: string;
    salesIncome: string;
    materialExpense: string;
    laborWages: string;
    travelCost: string;
    totalExpense: string;
    netProfit: string;
    netLoss: string;
    breakEven: string;
    margin: string;
    spentTitle: string;
    spentDetail: string;
    person: string;
    spent: string;
    share: string;
    membersTitle: string;
    membersDetail: string;
    member: string;
    hours: string;
    wages: string;
    travel: string;
    investment: string;
    contribution: string;
    contributionHint: string;
    cropTitle: string;
    cropDetail: string;
    directExpense: string;
    monthsTitle: string;
    monthsDetail: string;
    month: string;
    result: string;
    noData: string;
    allTime: string;
    first: string;
    monthWord: string;
    months: string;
  }
> = {
  bn: {
    monthScope: "মাসিক রিপোর্ট",
    allScope: "সম্পূর্ণ রিপোর্ট",
    monthDetail: "একটি মাসের হিসাব",
    allDetail: "শুরু থেকে আজ পর্যন্ত সব হিসাব",
    refresh: "রিপোর্ট নতুন করে আনুন",
    print: "প্রিন্ট / PDF",
    sales: "বিক্রি",
    expense: "খরচ",
    expenseHint: "মালামাল + মজুরি + যাতায়াত",
    profit: "লাভ",
    loss: "ক্ষতি",
    profitHint: "বিক্রি − খরচ",
    harvest: "ফসল তোলা",
    costPerKg: "প্রতি কেজি খরচ",
    costHint: "মোট খরচ ÷ তোলা ফসল",
    pending: "বাকি টাকা",
    pendingHint: "এখনো হাতে আসেনি",
    invested: "বিনিয়োগ",
    investedHint: "সদস্যদের দেওয়া টাকা",
    plTitle: "লাভ ও ক্ষতির হিসাব",
    plDetail: "টাকা কোথা থেকে এলো, কোথায় গেলো",
    salesIncome: "বিক্রি থেকে আয়",
    materialExpense: "মালামাল ও অন্য খরচ",
    laborWages: "শ্রমের মজুরি",
    travelCost: "যাতায়াত খরচ",
    totalExpense: "মোট খরচ",
    netProfit: "নিট লাভ",
    netLoss: "নিট ক্ষতি",
    breakEven: "লাভ-ক্ষতি সমান",
    margin: "লাভের হার",
    spentTitle: "কে কত খরচ করেছে",
    spentDetail: "যে যার পকেট থেকে দিয়েছে",
    person: "নাম",
    spent: "খরচ করেছে",
    share: "অংশ",
    membersTitle: "সদস্যদের অবদান",
    membersDetail: "টাকা, শ্রম ও বিনিয়োগ",
    member: "সদস্য",
    hours: "ঘণ্টা",
    wages: "মজুরি",
    travel: "যাতায়াত",
    investment: "বিনিয়োগ",
    contribution: "মোট অবদান",
    contributionHint: "খরচ করা টাকা + বিনিয়োগ",
    cropTitle: "ফসলভিত্তিক ফলাফল",
    cropDetail: "কোন ফসল কেমন করলো",
    directExpense: "সরাসরি খরচ",
    monthsTitle: "মাস অনুযায়ী হিসাব",
    monthsDetail: "প্রতি মাসের বিক্রি, খরচ ও ফলাফল",
    month: "মাস",
    result: "ফলাফল",
    noData: "এই সময়ের কোনো রেকর্ড নেই।",
    allTime: "শুরু থেকে আজ পর্যন্ত",
    first: "প্রথম রেকর্ড",
    monthWord: "মাসের রেকর্ড",
    months: "মাসের রেকর্ড",
  },
  en: {
    monthScope: "Monthly report",
    allScope: "Full report",
    monthDetail: "One month at a time",
    allDetail: "Every record since day one",
    refresh: "Refresh report",
    print: "Print / PDF",
    sales: "Sales",
    expense: "Expense",
    expenseHint: "Materials + wages + travel",
    profit: "Profit",
    loss: "Loss",
    profitHint: "Sales − expense",
    harvest: "Harvested",
    costPerKg: "Cost per kg",
    costHint: "Total expense ÷ harvest",
    pending: "Unpaid sales",
    pendingHint: "Money not received yet",
    invested: "Invested",
    investedHint: "Money put in by members",
    plTitle: "Profit & loss",
    plDetail: "Where the money came from and went",
    salesIncome: "Income from sales",
    materialExpense: "Materials and other expense",
    laborWages: "Labor wages",
    travelCost: "Travel cost",
    totalExpense: "Total expense",
    netProfit: "Net profit",
    netLoss: "Net loss",
    breakEven: "Break even",
    margin: "Profit margin",
    spentTitle: "Who spent how much",
    spentDetail: "Cash paid out of each pocket",
    person: "Name",
    spent: "Spent",
    share: "Share",
    membersTitle: "Member contribution",
    membersDetail: "Money, work and investment",
    member: "Member",
    hours: "Hours",
    wages: "Wages",
    travel: "Travel",
    investment: "Investment",
    contribution: "Contribution",
    contributionHint: "Cash spent + invested",
    cropTitle: "Crop performance",
    cropDetail: "How each crop did",
    directExpense: "Direct expense",
    monthsTitle: "Month by month",
    monthsDetail: "Sales, expense and result per month",
    month: "Month",
    result: "Result",
    noData: "No records in this period.",
    allTime: "All time",
    first: "First record",
    monthWord: "month on record",
    months: "months on record",
  },
  ja: {
    monthScope: "月次レポート",
    allScope: "全期間レポート",
    monthDetail: "1か月ずつ確認",
    allDetail: "開始から今日までのすべて",
    refresh: "レポートを更新",
    print: "印刷 / PDF",
    sales: "売上",
    expense: "支出",
    expenseHint: "資材＋賃金＋交通費",
    profit: "利益",
    loss: "損失",
    profitHint: "売上 − 支出",
    harvest: "収穫量",
    costPerKg: "1kgあたり原価",
    costHint: "支出合計 ÷ 収穫量",
    pending: "未収の売上",
    pendingHint: "まだ受け取っていない金額",
    invested: "出資額",
    investedHint: "メンバーが入れた資金",
    plTitle: "損益",
    plDetail: "お金の入りと出",
    salesIncome: "売上収入",
    materialExpense: "資材・その他支出",
    laborWages: "労賃",
    travelCost: "交通費",
    totalExpense: "支出合計",
    netProfit: "純利益",
    netLoss: "純損失",
    breakEven: "収支ゼロ",
    margin: "利益率",
    spentTitle: "誰がいくら使ったか",
    spentDetail: "各自が立て替えた金額",
    person: "名前",
    spent: "支出額",
    share: "割合",
    membersTitle: "メンバーの貢献",
    membersDetail: "資金・作業・出資",
    member: "メンバー",
    hours: "時間",
    wages: "労賃",
    travel: "交通費",
    investment: "出資",
    contribution: "貢献合計",
    contributionHint: "立替金＋出資",
    cropTitle: "作物別の成績",
    cropDetail: "作物ごとの結果",
    directExpense: "直接費",
    monthsTitle: "月別の推移",
    monthsDetail: "月ごとの売上・支出・損益",
    month: "月",
    result: "損益",
    noData: "この期間の記録はありません。",
    allTime: "全期間",
    first: "最初の記録",
    monthWord: "か月分の記録",
    months: "か月分の記録",
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
// "2026-08" reads better as "Aug 2026" on the report tables.
const monthName = (month: string, language: Language) =>
  new Intl.DateTimeFormat(
    language === "ja" ? "ja-JP" : language === "bn" ? "bn-BD" : "en-GB",
    { year: "numeric", month: "short" },
  ).format(new Date(`${month}-01T00:00:00`));
// Notes are stored as "Label: value | Label: value", so read one label back.
const noteValue = (note: string | null | undefined, label: string) =>
  note?.match(new RegExp(`${label}:\\s*([^|]+)`, "i"))?.[1].trim() ?? "";
// "Abu Bhai", "Abu bhai" and "abu  bhai" are one customer, so names are matched
// on a squashed lowercase form while the display keeps the member's spelling.
const customerKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => [...part][0]?.toUpperCase() ?? "")
    .join("") || "?";
const noteLabels = [
  "Customer",
  // Imported rows name the buyer "Buyer"; editing one rewrites it as "Customer",
  // so the old label must not survive in the free note as well.
  "Buyer",
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
// Expenses imported from the 2026 workbook name their payer in the note text
// rather than in a "Paid by" label, so read that too instead of dropping the
// money into an unattributed pile.
const importedPayer = (note?: string | null) =>
  note?.match(/Hatake 2026 import — ([A-Za-z]+)(?:\s*[(|]|$)/)?.[1] ?? "";
const payerOf = (entry: Entry) =>
  noteValue(entry.note, "Paid by") ||
  (entry.kind === "expense" ? importedPayer(entry.note) : "");
// Expense total per person, biggest spender first.
const spendByPerson = (rows: Entry[]) => {
  const totals = new Map<string, number>();
  rows
    .filter((entry) => entry.kind === "expense")
    .forEach((entry) => {
      const name = payerOf(entry) || unknownHolder;
      totals.set(name, (totals.get(name) ?? 0) + Number(entry.amount ?? 0));
    });
  return [...totals.entries()].sort(([, a], [, b]) => b - a);
};
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
  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<FarmOrder[]>([]);
  const [careAlerts, setCareAlerts] = useState<CareAlert[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [alertsReady, setAlertsReady] = useState(false);
  const [investmentsReady, setInvestmentsReady] = useState(false);
  const [reportMonth, setReportMonth] = useState(today().slice(0, 7));
  const [reportScope, setReportScope] = useState<ReportScope>("month");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [editingBatch, setEditingBatch] = useState<CropBatch | null>(null);
  const [editingTask, setEditingTask] = useState<CropTask | null>(null);
  const [editingHandover, setEditingHandover] = useState<CashHandover | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">("signIn");
  // A password-reset link signs the member in with a session whose only purpose
  // is choosing a new password, so that panel replaces the whole app until the
  // new password is saved.
  const [recovery, setRecovery] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [language, setLanguage] = useState<Language>("bn");
  const [saleLines, setSaleLines] = useState<SaleLine[]>([
    { id: 1, crop: "", amount: "", quantity: "", unit: "" },
  ]);
  const [expenseLines, setExpenseLines] = useState<ExpenseLine[]>([
    { id: 1, category: "", amount: "", quantity: "", unit: "" },
  ]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  const [allCustomers, setAllCustomers] = useState(false);
  const [filterCrop, setFilterCrop] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  // Bills state
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billCustomerList, setBillCustomerList] = useState<string[]>([]);
  const [selectedBillCustomer, setSelectedBillCustomer] = useState("");
  const [billDatesForCustomer, setBillDatesForCustomer] = useState<string[]>([]);
  const [manualBillMode, setManualBillMode] = useState(false);
  const [manualBillItems, setManualBillItems] = useState<Array<{id: number; crop: string; quantity: string; unit: string; price: string; amount: string}>>([{id: 1, crop: "", quantity: "", unit: "", price: "", amount: ""}]);
  const lastManualBillLineId = useRef(1);
  const [existingCustomers, setExistingCustomers] = useState<string[]>([]);
  const [allCrops, setAllCrops] = useState<string[]>([]);
  const [showNewCustomerInput, setShowNewCustomerInput] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [billDiscount, setBillDiscount] = useState(""); // discount percentage or amount
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editBillItems, setEditBillItems] = useState<Array<{id: number; crop: string; quantity: string; unit: string; price: string; amount: string}>>([]);
  const [editBillDiscount, setEditBillDiscount] = useState("");
  const [editDiscountType, setEditDiscountType] = useState<"percentage" | "fixed">("percentage");
  // Summary view state
  const [summaryStartDate, setSummaryStartDate] = useState(today());
  const [summaryEndDate, setSummaryEndDate] = useState(today());
  // Line ids never repeat, not even after a save, so an emptied form mounts
  // fresh fields instead of reusing the last one's "typing a new crop" state.
  const lastSaleLineId = useRef(1);
  const lastExpenseLineId = useRef(1);
  const blankSaleLine = (unit = ""): SaleLine => ({
    id: (lastSaleLineId.current += 1),
    crop: "",
    amount: "",
    quantity: "",
    unit,
  });
  const blankExpenseLine = (unit = ""): ExpenseLine => ({
    id: (lastExpenseLineId.current += 1),
    category: "",
    amount: "",
    quantity: "",
    unit,
  });
  const resetSaleLines = () => setSaleLines([blankSaleLine()]);
  const resetExpenseLines = () => setExpenseLines([blankExpenseLine()]);
  const addSaleLine = () =>
    setSaleLines((lines) => [
      ...lines,
      // The next crop usually goes out in the same unit as the last one.
      blankSaleLine(lines[lines.length - 1]?.unit ?? ""),
    ]);
  const addExpenseLine = () =>
    setExpenseLines((lines) => [
      ...lines,
      blankExpenseLine(lines[lines.length - 1]?.unit ?? ""),
    ]);
  const removeSaleLine = (id: number) =>
    setSaleLines((lines) =>
      lines.length > 1 ? lines.filter((line) => line.id !== id) : lines,
    );
  const removeExpenseLine = (id: number) =>
    setExpenseLines((lines) =>
      lines.length > 1 ? lines.filter((line) => line.id !== id) : lines,
    );
  const changeSaleLine = (id: number, patch: Partial<SaleLine>) =>
    setSaleLines((lines) =>
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  const changeExpenseLine = (id: number, patch: Partial<ExpenseLine>) =>
    setExpenseLines((lines) =>
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  const saleLinesTotal = saleLines.reduce(
    (total, line) => total + (Number(line.amount) || 0),
    0,
  );
  const expenseLinesTotal = expenseLines.reduce(
    (total, line) => total + (Number(line.amount) || 0),
    0,
  );
  // A viewer reads everything and writes nothing. The database refuses their
  // writes anyway; these checks keep the interface from offering what would only
  // come back as a permission error.
  const readOnly = farm?.role === "viewer";

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
      setHandovers([]);
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
        handoverResult,
        billResult,
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("farm_id", selected.id)
          .order("occurred_on", { ascending: false })
          .limit(100000),
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
        supabase
          .from("cash_handovers")
          .select("*")
          .eq("farm_id", selected.id)
          .order("occurred_on", { ascending: false }),
        supabase
          .from("bills")
          .select("*")
          .eq("farm_id", selected.id)
          .order("bill_date", { ascending: false }),
      ]);
      setEntries((entryResult.data ?? []) as Entry[]);
      setBills((billResult.data ?? []) as Bill[]);
      setBatches((batchResult.data ?? []) as CropBatch[]);
      setInventory((inventoryResult.data ?? []) as InventoryItem[]);
      setOrders((orderResult.data ?? []) as FarmOrder[]);
      setCropTasks((taskResult.data ?? []) as CropTask[]);
      setHandovers((handoverResult.data ?? []) as CashHandover[]);
    } else setFarm(null);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      void loadWorkspace();
    });
    return () => {
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  // The app itself no longer mails anything, but a recovery link sent by hand
  // from the Supabase dashboard still lands here. `type=recovery` in the address
  // opens the "set a new password" panel even before Supabase has finished
  // exchanging the code. A dead or already-used link comes back with an error
  // instead, and that is worth showing rather than silently landing on the
  // sign-in form.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(
        `${window.location.search}${window.location.hash.replace("#", "&")}`,
      );
      if (params.get("type") === "recovery") setRecovery(true);
      const linkError =
        params.get("error_description") ?? params.get("error") ?? "";
      if (linkError) setNotice(linkError.replace(/\+/g, " "));
    }, 0);
    return () => window.clearTimeout(timer);
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
    // Forgetting a password is settled on the spot: the member types their email
    // and the password they want, and the database sets it. The farm has no mail
    // sender, so an emailed link would have reached nobody. The trade-off that
    // buys is written down in supabase/forgot-password.sql.
    if (mode === "reset") {
      const address = String(form.get("email")).trim();
      const next = String(form.get("password"));
      if (next !== String(form.get("confirm"))) {
        setBusy(false);
        setNotice("The two passwords do not match.");
        return;
      }
      const done = await supabase.rpc("reset_forgotten_password", {
        member_email: address,
        new_password: next,
      });
      if (done.error) {
        setBusy(false);
        setNotice(done.error.message);
        return;
      }
      // Straight in with the password they just chose, so there is no second
      // form to fill in and nothing to carry from one screen to the next.
      const entry = await supabase.auth.signInWithPassword({
        email: address,
        password: next,
      });
      setBusy(false);
      if (entry.error) {
        setMode("signIn");
        setNotice("Password set. Sign in with the new one.");
        return;
      }
      setNotice("Password set. You are signed in.");
      return;
    }
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

  // Saves the password chosen after following a reset link. The recovery session
  // is already active at this point, so no current password is asked for — the
  // emailed link is the proof.
  async function completeRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const next = String(form.get("password"));
    if (next !== String(form.get("confirm"))) {
      setNotice("The two passwords do not match.");
      return;
    }
    setBusy(true);
    const result = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (result.error) {
      setNotice(result.error.message);
      return;
    }
    setRecovery(false);
    // Drop the recovery marker so a reload does not reopen this panel.
    window.history.replaceState({}, "", window.location.pathname);
    setNotice("Password updated. You are signed in.");
    await loadWorkspace();
  }

  // Changing the password from inside the app asks for the current one first.
  // Supabase does not require it, but an unattended laptop should not be enough
  // to take over a member's account.
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !email) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const next = String(form.get("password"));
    if (next !== String(form.get("confirm"))) {
      setNotice("The two new passwords do not match.");
      return;
    }
    setBusy(true);
    const check = await supabase.auth.signInWithPassword({
      email,
      password: String(form.get("current")),
    });
    if (check.error) {
      setBusy(false);
      setNotice("The current password is not correct.");
      return;
    }
    const result = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    setNotice(result.error ? result.error.message : "Password changed.");
    if (!result.error) formElement.reset();
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
    if (!supabase || !farm || readOnly) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { data: sessionData } = await supabase.auth.getSession();
    const amount = String(form.get("amount") ?? "");
    const quantity = String(form.get("quantity") ?? "");
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
    // Sales are entered as a list of crops for one customer, so one save writes
    // one row per crop sharing the same date and customer note. Per-crop rows
    // keep the crop-wise income and harvest figures honest.
    // Expenses can also be entered as a list of items with different categories.
    const records =
      view === "sales"
        ? saleLines
            .filter((line) => line.crop && line.amount)
            .map((line) => ({
              kind: "sale",
              occurred_on: form.get("date"),
              crop: line.crop,
              amount: Number(line.amount),
              quantity: line.quantity ? Number(line.quantity) : null,
              unit: line.unit.trim() || null,
              note: note || null,
            }))
        : view === "expense"
          ? expenseLines
              .filter((line) => line.category && line.amount)
              .map((line) => ({
                kind: "expense",
                occurred_on: form.get("date"),
                crop: line.category,
                amount: Number(line.amount),
                quantity: line.quantity ? Number(line.quantity) : null,
                unit: line.unit.trim() || null,
                note: note || null,
              }))
          : [
              {
                kind: form.get("kind"),
                occurred_on: form.get("date"),
                crop: String(form.get("crop")) || null,
                amount: amount ? Number(amount) : null,
                quantity: quantity ? Number(quantity) : null,
                unit: String(form.get("unit") ?? "") || null,
                note: note || null,
              },
            ];
    if (!records.length) {
      setNotice(sales.needItem);
      return;
    }
    setBusy(true);
    const result = editing
      ? await supabase
          .from("transactions")
          .update(records[0])
          .eq("id", editing.id)
      : await supabase.from("transactions").insert(
          records.map((record) => ({
            ...record,
            farm_id: farm.id,
            created_by: sessionData.session?.user.id,
          })),
        );
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : editing
          ? "Record updated."
          : records.length > 1
            ? `${records.length} ${sales.savedCount} ${yen(view === "sales" ? saleLinesTotal : expenseLinesTotal)}`
            : "Record saved.",
    );
    if (!result.error) {
      formElement.reset();
      setEditing(null);
      resetSaleLines();
      resetExpenseLines();
      await loadWorkspace();
    }
  }

  async function saveLabor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm || readOnly) return;
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
    if (!supabase || readOnly || !window.confirm("Delete this record?")) return;
    setBusy(true);
    const result = await supabase.from("transactions").delete().eq("id", id);
    setBusy(false);
    setNotice(result.error ? result.error.message : "Record deleted.");
    if (!result.error) await loadWorkspace();
  }

  async function generateBillFromSales(
    customerId: string,
    startDate: string,
    endDate: string
  ) {
    if (!supabase || !farm) return;

    const { data: sales } = await supabase
      .from("transactions")
      .select("*")
      .eq("farm_id", farm.id)
      .eq("kind", "sale")
      .gte("occurred_on", startDate)
      .lte("occurred_on", endDate)
      .filter("note", "ilike", `%${customerId}%`);

    if (!sales || !sales.length) {
      setNotice("No sales found for this customer in the selected date range");
      return;
    }

    const totalAmount = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const { data: sessionData } = await supabase.auth.getSession();

    setBusy(true);
    const billResult = await supabase
      .from("bills")
      .insert({
        farm_id: farm.id,
        bill_number: `BILL-${Date.now()}`,
        customer_name: customerId,
        bill_date: new Date().toISOString().split("T")[0],
        total_amount: totalAmount,
        status: "draft",
        created_by: sessionData.session?.user.id,
      })
      .select();

    if (billResult.error || !billResult.data || !billResult.data[0]) {
      setBusy(false);
      setNotice(billResult.error?.message || "Failed to create bill");
      return;
    }

    const billId = billResult.data[0].id;
    const items = sales.map((sale) => ({
      bill_id: billId,
      description: sale.crop || "Item",
      quantity: sale.quantity || 1,
      unit: sale.unit || "pcs",
      unit_price: sale.amount || 0,
      amount: sale.amount || 0,
    }));

    const itemsResult = await supabase.from("bill_items").insert(items);

    setBusy(false);
    if (itemsResult.error) {
      setNotice(itemsResult.error.message);
    } else {
      setNotice("Bill generated successfully!");
      await loadWorkspace();
    }
  }

  async function recordBillPayment(
    billId: string,
    amount: number,
    paymentMethod: string
  ) {
    if (!supabase) return;

    const { data: sessionData } = await supabase.auth.getSession();
    setBusy(true);
    const result = await supabase.from("bill_payments").insert({
      bill_id: billId,
      amount,
      payment_method: paymentMethod,
      recorded_by: sessionData.session?.user.id,
    });

    setBusy(false);
    if (result.error) {
      setNotice(result.error.message);
    } else {
      setNotice("Payment recorded successfully!");
      await loadWorkspace();
    }
  }

  async function updateBillStatus(billId: string, status: string) {
    if (!supabase) return;

    setBusy(true);
    const result = await supabase
      .from("bills")
      .update({ status })
      .eq("id", billId);

    setBusy(false);
    if (result.error) {
      setNotice(result.error.message);
    } else {
      setNotice("Bill status updated!");
      if (selectedBill) {
        setSelectedBill({ ...selectedBill, status: status as "draft" | "issued" | "sent" | "paid" | "overdue" });
      }
      await loadWorkspace();
    }
  }

  async function deleteBill(billId: string) {
    if (!supabase || !window.confirm("Delete this bill?")) return;

    setBusy(true);
    const result = await supabase.from("bills").delete().eq("id", billId);

    setBusy(false);
    if (result.error) {
      setNotice(result.error.message);
    } else {
      setNotice("Bill deleted!");
      await loadWorkspace();
    }
  }

  async function downloadBillPDF(bill: Bill, billItems: BillItem[]) {
    // Create an invisible container for rendering
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.width = "210mm";
    container.style.padding = "15mm";
    container.style.background = "white";
    container.style.fontFamily = "'Noto Sans Bengali', Arial, sans-serif";
    container.style.fontSize = "12px";
    container.style.lineHeight = "1.5";

    const dueAmount = bill.total_amount - bill.paid_amount;
    const isPaid = bill.status === "paid";

    container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap');
        body { font-family: 'Noto Sans Bengali', Arial, sans-serif; }
        * { font-family: 'Noto Sans Bengali', Arial, sans-serif; }
      </style>
      <!-- Header with Company Name -->
      <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #2d5016;">
        <div style="font-size: 24px; margin-bottom: 8px; font-weight: bold;">🌿 Chiba Hatake — সবজির হিসাব</div>
        <div style="font-size: 12px; color: #666;">চিবা হাটেকে তাজা সবজির বিল</div>
      </div>

      <!-- Bill Info Row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid #ddd;">
        <div>
          <p style="margin: 2px 0;"><strong>বিল #:</strong> ${bill.bill_number}</p>
          <p style="margin: 2px 0;"><strong>গ্রাহক:</strong> ${bill.customer_name}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 2px 0;"><strong>তারিখ:</strong> ${bill.bill_date}</p>
          <p style="margin: 2px 0;"><strong>অবস্থা:</strong> ${bill.status.toUpperCase()}</p>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
        <thead>
          <tr style="background: #f5f5f5; border-top: 2px solid #333; border-bottom: 2px solid #333;">
            <th style="padding: 10px 8px; text-align: left; font-weight: bold;">সবজি</th>
            <th style="padding: 10px 8px; text-align: center; font-weight: bold;">পরিমাণ</th>
            <th style="padding: 10px 8px; text-align: right; font-weight: bold;">প্রতি কেজি/পিস দাম</th>
            <th style="padding: 10px 8px; text-align: right; font-weight: bold;">মোট</th>
          </tr>
        </thead>
        <tbody>
          ${billItems.map((item, idx) => `
            <tr style="border-bottom: 1px solid #ddd; ${idx % 2 === 0 ? 'background: #f9f9f9;' : ''}">
              <td style="padding: 10px 8px; text-align: left;">${item.description}</td>
              <td style="padding: 10px 8px; text-align: center;">${item.quantity} ${item.unit}</td>
              <td style="padding: 10px 8px; text-align: right;">¥${item.unit_price?.toLocaleString()}</td>
              <td style="padding: 10px 8px; text-align: right; font-weight: bold;">¥${item.amount?.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Summary Section -->
      <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #333;">
        ${(() => {
          const subtotal = billItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          const discount = subtotal - bill.total_amount;
          return `
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; font-size: 11px; margin-bottom: 8px;">
              <div style="text-align: right;"><strong>মোট আইটেম মূল্য:</strong></div>
              <div style="text-align: right;">¥${subtotal.toLocaleString()}</div>
            </div>
            ${discount > 0 ? `
              <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; font-size: 11px; margin-bottom: 8px; color: #d9534f;">
                <div style="text-align: right;"><strong>ছাড়:</strong></div>
                <div style="text-align: right;">-¥${discount.toLocaleString()}</div>
              </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; font-size: 13px; padding: 10px 0; border-top: 2px solid #333; border-bottom: 2px solid #333;">
              <div style="text-align: right; font-weight: bold;">সর্বমোট:</div>
              <div style="text-align: right; font-weight: bold;">¥${bill.total_amount.toLocaleString()}</div>
            </div>
          `;
        })()}

        ${isPaid ? `
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; font-size: 12px; padding: 10px 0; background: #c8e6c9; padding-left: 10px; margin-top: 10px;">
            <strong style="text-align: right;">অবস্থা:</strong>
            <strong style="text-align: right;">সম্পূর্ণ পরিশোধিত ✓</strong>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; font-size: 11px; margin-bottom: 5px; padding-top: 10px;">
            <div style="text-align: right;">প্রদান করা হয়েছে:</div>
            <div style="text-align: right;">¥${bill.paid_amount.toLocaleString()}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; font-size: 11px; color: #d9534f;">
            <div style="text-align: right;"><strong>পাওনা:</strong></div>
            <div style="text-align: right;"><strong>¥${dueAmount.toLocaleString()}</strong></div>
          </div>
        `}
      </div>

      <!-- Footer -->
      <div style="margin-top: 25px; padding-top: 15px; border-top: 3px solid #2d5016; text-align: center;">
        <p style="margin: 8px 0; font-size: 13px; font-weight: bold;">🌿 Chiba Hatake-এর মোট বিল = ¥${bill.total_amount.toLocaleString()} 🌿</p>
        <p style="margin: 8px 0; font-size: 10px; color: #666;">ধন্যবাদ আমাদের সাথে কেনাকাটার জন্য!</p>
        <p style="margin: 5px 0; font-size: 9px; color: #999;">${bill.bill_date}</p>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Bill-${bill.bill_number}-${bill.customer_name}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  }

  async function createManualBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let customerName = String(form.get("customer_name"));

    // Use newCustomerName if creating new customer
    if (showNewCustomerInput && newCustomerName) {
      customerName = newCustomerName;
    }

    if (!customerName) {
      setNotice("Please select or enter a customer name");
      return;
    }

    const billDate = String(form.get("bill_date"));

    // Collect line items with new price field
    const items: { crop: string; quantity: number; unit: string; amount: number }[] = [];
    let itemCount = 0;
    while (form.get(`item_crop_${itemCount}`)) {
      const crop = String(form.get(`item_crop_${itemCount}`));
      const quantity = Number(form.get(`item_qty_${itemCount}`)) || 1;
      const unit = String(form.get(`item_unit_${itemCount}`)) || "pcs";
      const price = Number(form.get(`item_price_${itemCount}`)) || 0;
      const amount = quantity * price;

      if (crop && price > 0 && quantity > 0) {
        items.push({ crop, quantity, unit, amount });
      }
      itemCount++;
    }

    if (items.length === 0) {
      setNotice("Please add at least one item with price and quantity");
      return;
    }

    let totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Apply discount if provided
    if (billDiscount) {
      const discountValue = Number(billDiscount);
      if (discountType === "percentage") {
        totalAmount = totalAmount - (totalAmount * discountValue) / 100;
      } else {
        totalAmount = totalAmount - discountValue;
      }
    }

    totalAmount = Math.max(0, totalAmount); // Ensure no negative total
    const { data: sessionData } = await supabase.auth.getSession();

    setBusy(true);
    const billResult = await supabase
      .from("bills")
      .insert({
        farm_id: farm.id,
        bill_number: `BILL-${Date.now()}`,
        customer_name: customerName,
        bill_date: billDate,
        total_amount: totalAmount,
        status: "draft",
        created_by: sessionData.session?.user.id,
      })
      .select();

    if (billResult.error || !billResult.data || !billResult.data[0]) {
      setBusy(false);
      setNotice(billResult.error?.message || "Failed to create bill");
      return;
    }

    const billId = billResult.data[0].id;
    const billItems = items.map((item) => ({
      bill_id: billId,
      description: item.crop,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.amount / item.quantity,
      amount: item.amount,
    }));

    const itemsResult = await supabase.from("bill_items").insert(billItems);

    setBusy(false);
    if (itemsResult.error) {
      setNotice(itemsResult.error.message);
    } else {
      setNotice("Manual bill created successfully!");
      formElement.reset();
      await loadWorkspace();
    }
  }

  function loadBillCustomers() {
    if (!farm) return;

    // Get all sales transactions
    const sales = entries.filter(e => e.kind === "sale");

    // Extract unique customers from notes
    const customers = new Set<string>();
    sales.forEach(sale => {
      const customerMatch = sale.note?.match(/Customer: ([^\|]+)/);
      if (customerMatch) {
        customers.add(customerMatch[1].trim());
      }
    });

    setBillCustomerList(Array.from(customers).sort());
    setSelectedBillCustomer("");
    setBillDatesForCustomer([]);
  }

  function loadExistingCustomers() {
    const sales = entries.filter(e => e.kind === "sale");
    const customers = new Set<string>();
    sales.forEach(sale => {
      const customerMatch = sale.note?.match(/Customer: ([^\|]+)/);
      if (customerMatch) {
        customers.add(customerMatch[1].trim());
      }
    });
    setExistingCustomers(Array.from(customers).sort());
  }

  function loadAllCrops() {
    const sales = entries.filter(e => e.kind === "sale");
    const crops = new Set<string>();
    sales.forEach(sale => {
      if (sale.crop) {
        crops.add(sale.crop);
      }
    });
    setAllCrops(Array.from(crops).sort());
  }

  function loadDatesForCustomer(customerName: string) {
    // Get all sales for this customer
    const sales = entries.filter(
      e =>
        e.kind === "sale" &&
        e.note?.includes(`Customer: ${customerName}`)
    );

    // Extract unique dates
    const dates = new Set(sales.map(s => s.occurred_on));
    setBillDatesForCustomer(Array.from(dates).sort().reverse());
  }

  async function saveHandover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm || readOnly) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fromHolder = String(form.get("from_holder")).trim();
    const toHolder = String(form.get("to_holder")).trim();
    // Postgres rejects this too, but the member deserves a readable reason.
    if (fromHolder.toLowerCase() === toHolder.toLowerCase()) {
      setNotice(handover.sameHolder);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    setBusy(true);
    const record = {
      occurred_on: form.get("date"),
      from_holder: fromHolder,
      to_holder: toHolder,
      amount: Number(form.get("amount")) || 0,
      note: String(form.get("note")).trim() || null,
    };
    const result = editingHandover
      ? await supabase
          .from("cash_handovers")
          .update(record)
          .eq("id", editingHandover.id)
      : await supabase.from("cash_handovers").insert({
          ...record,
          farm_id: farm.id,
          created_by: sessionData.session?.user.id,
        });
    setBusy(false);
    setNotice(
      result.error
        ? result.error.message
        : editingHandover
          ? "Handover updated."
          : "Handover saved.",
    );
    if (!result.error) {
      formElement.reset();
      setEditingHandover(null);
      await loadWorkspace();
    }
  }

  async function deleteHandover(id: string) {
    if (!supabase || readOnly || !window.confirm("Delete this handover?"))
      return;
    setBusy(true);
    const result = await supabase.from("cash_handovers").delete().eq("id", id);
    setBusy(false);
    setNotice(result.error ? result.error.message : "Handover deleted.");
    if (!result.error) await loadWorkspace();
  }

  async function deleteBatch(id: string) {
    if (
      !supabase ||
      readOnly ||
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
    if (!supabase || !farm || readOnly) return;
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
    if (!supabase || readOnly) return;
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
    if (!supabase || readOnly || !window.confirm("Delete this farm task?"))
      return;
    setBusy(true);
    const result = await supabase.from("crop_tasks").delete().eq("id", id);
    setBusy(false);
    setNotice(result.error ? result.error.message : "Farm task deleted.");
    if (!result.error) await loadWorkspace();
  }

  async function addFarmMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !farm || readOnly) return;
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
    if (!supabase || !farm || readOnly) return;
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
    if (!supabase || !farm || readOnly) return;
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
    if (!supabase || !farm || readOnly) return;
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
    if (readOnly) return;
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
    if (readOnly) return;
    setCareAlerts((current) => current.filter((alert) => alert.id !== id));
  }

  function saveInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
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
    if (readOnly) return;
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
    if (!supabase || !farm || readOnly) return;
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
  const summaryByCustomer = useMemo(
    () => {
      const filtered = entries.filter(e =>
        e.kind === "sale" &&
        e.occurred_on >= summaryStartDate &&
        e.occurred_on <= summaryEndDate
      );
      const result: Record<string, number> = {};
      filtered.forEach(entry => {
        const customer =
          noteValue(entry.note, "Customer") ||
          noteValue(entry.note, "Buyer") ||
          "Unknown";
        result[customer] = (result[customer] ?? 0) + Number(entry.amount ?? 0);
      });
      return Object.fromEntries(
        Object.entries(result).sort((a, b) => b[1] - a[1])
      );
    },
    [entries, summaryStartDate, summaryEndDate],
  );
  const summaryTotal = useMemo(
    () => Object.values(summaryByCustomer).reduce((sum, val) => sum + val, 0),
    [summaryByCustomer],
  );
  const displayedEntries =
    view === "sales"
      ? entries
          .filter((entry) => entry.kind === "sale")
          .filter((entry) => {
            if (filterCrop && entry.crop !== filterCrop) return false;
            const amount = Number(entry.amount ?? 0);
            if (filterMinAmount && amount < Number(filterMinAmount))
              return false;
            if (filterMaxAmount && amount > Number(filterMaxAmount))
              return false;
            if (filterCustomer) {
              const customer =
                noteValue(entry.note, "Customer") ||
                noteValue(entry.note, "Buyer") ||
                unknownHolder;
              if (!customerKey(customer).includes(customerKey(filterCustomer)))
                return false;
            }
            return true;
          })
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
  const startHandoverEdit = (record: CashHandover) => {
    setEditingHandover(record);
    setNotice(`Editing the handover from ${record.from_holder}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startEdit = (entry: Entry) => {
    setEditing(entry);
    if (entry.kind === "sale")
      setSaleLines([
        {
          ...blankSaleLine(entry.unit ?? ""),
          crop: entry.crop ?? "",
          amount: entry.amount === null ? "" : String(entry.amount),
          quantity: entry.quantity === null ? "" : String(entry.quantity),
        },
      ]);
    else if (entry.kind === "expense")
      setExpenseLines([
        {
          ...blankExpenseLine(entry.unit ?? ""),
          category: entry.crop ?? "",
          amount: entry.amount === null ? "" : String(entry.amount),
          quantity: entry.quantity === null ? "" : String(entry.quantity),
        },
      ]);
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
    const people = new Map<
      string,
      {
        collected: number;
        spent: number;
        handedOut: number;
        received: number;
      }
    >();
    const person = (name: string) => {
      if (!people.has(name))
        people.set(name, {
          collected: 0,
          spent: 0,
          handedOut: 0,
          received: 0,
        });
      return people.get(name)!;
    };
    paidSales.forEach((entry) => {
      person(noteValue(entry.note, "Cash with") || unknownHolder).collected +=
        Number(entry.amount ?? 0);
    });
    entries
      .filter((entry) => entry.kind === "expense")
      .forEach((entry) => {
        const payer = payerOf(entry);
        // No payer recorded means we cannot say whose cash it came out of.
        if (payer) person(payer).spent += Number(entry.amount ?? 0);
      });
    // A handover is not income or expense: the same yen simply changes hands.
    handovers.forEach((record) => {
      person(record.from_holder).handedOut += Number(record.amount ?? 0);
      person(record.to_holder).received += Number(record.amount ?? 0);
    });
    return [...people.entries()]
      .map(([name, totals]) => ({
        name,
        ...totals,
        balance:
          totals.collected + totals.received - totals.spent - totals.handedOut,
      }))
      .sort((a, b) => b.balance - a.balance);
  })();
  const untrackedSpend = entries
    .filter((entry) => entry.kind === "expense" && !payerOf(entry))
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
  // One card per customer: every purchase they ever made, the days they came
  // and what they bought, so a regular like Abu Bhai reads as a single name.
  const customers = (() => {
    type Bill = {
      key: string;
      date: string;
      items: string[];
      total: number;
      pending: boolean;
    };
    type Customer = {
      key: string;
      name: string;
      spellings: Map<string, number>;
      total: number;
      pending: number;
      items: number;
      firstDate: string;
      lastDate: string;
      crops: Map<string, number>;
      bills: Map<string, Bill>;
    };
    const all = new Map<string, Customer>();
    entries
      .filter((entry) => entry.kind === "sale")
      .forEach((entry) => {
        // Rows imported from the 2026 workbook label the buyer "Buyer", so read
        // that too instead of filing them all under "Not recorded".
        const name =
          noteValue(entry.note, "Customer") ||
          noteValue(entry.note, "Buyer") ||
          unknownHolder;
        const key = customerKey(name);
        const customer = all.get(key) ?? {
          key,
          name,
          spellings: new Map<string, number>(),
          total: 0,
          pending: 0,
          items: 0,
          firstDate: entry.occurred_on,
          lastDate: entry.occurred_on,
          crops: new Map<string, number>(),
          bills: new Map<string, Bill>(),
        };
        const amount = Number(entry.amount ?? 0);
        const unpaid = /Payment:\s*Pending/i.test(entry.note ?? "");
        customer.spellings.set(name, (customer.spellings.get(name) ?? 0) + 1);
        customer.total += amount;
        if (unpaid) customer.pending += amount;
        customer.items += 1;
        if (entry.occurred_on < customer.firstDate)
          customer.firstDate = entry.occurred_on;
        if (entry.occurred_on > customer.lastDate)
          customer.lastDate = entry.occurred_on;
        const crop = entry.crop || "—";
        customer.crops.set(crop, (customer.crops.get(crop) ?? 0) + amount);
        const bill = customer.bills.get(entry.occurred_on) ?? {
          key: `${key}|${entry.occurred_on}`,
          date: entry.occurred_on,
          items: [],
          total: 0,
          pending: false,
        };
        bill.items.push(
          `${crop}${entry.quantity ? ` (${entry.quantity}${entry.unit ? ` ${entry.unit}` : ""})` : ""}`,
        );
        bill.total += amount;
        if (unpaid) bill.pending = true;
        customer.bills.set(entry.occurred_on, bill);
        all.set(key, customer);
      });
    return [...all.values()]
      .map((customer) => ({
        key: customer.key,
        // The spelling the member typed most often wins the card title.
        name: [...customer.spellings.entries()].sort(
          ([, a], [, b]) => b - a,
        )[0][0],
        total: customer.total,
        pending: customer.pending,
        items: customer.items,
        visits: customer.bills.size,
        firstDate: customer.firstDate,
        lastDate: customer.lastDate,
        crops: [...customer.crops.entries()].sort(([, a], [, b]) => b - a),
        bills: [...customer.bills.values()].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      }))
      .sort((a, b) => b.total - a.total);
  })();
  const customerSales = customers.reduce(
    (total, customer) => total + customer.total,
    0,
  );
  const matchedCustomers = customers.filter((customer) =>
    customerKey(customer.name).includes(customerKey(customerQuery)),
  );
  // The biggest buyers first; the rest are one tap away rather than hidden.
  const shownCustomers =
    allCustomers || customerQuery
      ? matchedCustomers
      : matchedCustomers.slice(0, 8);
  // "Not recorded" is a pile of old rows, not a person, so it never wins the
  // top-customer tile.
  const topCustomer =
    customers.find((customer) => customer.key !== customerKey(unknownHolder)) ??
    customers[0];
  // Names already used anywhere, so the field can be filled with one tap.
  const knownHolders = [
    ...new Set(
      [
        ...entries.flatMap((entry) => [
          noteValue(entry.note, "Cash with"),
          payerOf(entry),
          noteValue(entry.note, "Member"),
        ]),
        ...handovers.flatMap((record) => [
          record.from_holder,
          record.to_holder,
        ]),
      ].filter(Boolean),
    ),
  ].sort();
  // Buyers who have bought before, picked from a list instead of retyped. The
  // list is built from the saved sales, so a new customer joins it on save.
  const knownCustomers = customers
    .filter((customer) => customer.key !== customerKey(unknownHolder))
    .map((customer) => customer.name)
    .sort((a, b) => a.localeCompare(b));
  // The starting crop list plus every crop the farm has since recorded, so a
  // crop entered once is a choice in every crop dropdown from then on. Expense
  // rows keep their category in `crop`, not a crop name, so they stay out.
  const knownCrops = (() => {
    const builtIn = crops.filter((crop) => crop !== "Other");
    const recorded = [
      ...entries
        .filter((entry) => entry.kind !== "expense")
        .map((entry) => entry.crop),
      ...batches.map((batch) => batch.crop),
      ...orders.map((order) => order.crop),
      ...careAlerts.map((alert) => alert.crop),
    ].filter((crop): crop is string => Boolean(crop));
    const extra = [...new Set(recorded)]
      .filter((crop) => crop !== "Other" && !builtIn.includes(crop))
      .sort((a, b) => a.localeCompare(b));
    // "Other" belongs at the bottom, under the crops actually grown.
    return [...builtIn, ...extra, "Other"];
  })();

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
  // Reached by following a recovery link sent from the Supabase dashboard. The
  // link itself is the proof of identity, so this panel only asks for the new
  // password.
  if (recovery && email)
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Hatake Hishab</p>
          <h1>Set a new password</h1>
          <p>
            Signed in as {email}. Choose a password of at least 8 characters.
          </p>
          <form onSubmit={completeRecovery} className="form">
            <label>
              New password
              <input name="password" type="password" minLength={8} required />
            </label>
            <label>
              Repeat new password
              <input name="confirm" type="password" minLength={8} required />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Please wait…" : "Save new password"}
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setRecovery(false);
                window.history.replaceState({}, "", window.location.pathname);
                setNotice("");
              }}
            >
              Keep the old password
            </button>
          </form>
          {notice && <p className="notice">{notice}</p>}
        </section>
      </main>
    );
  if (!email)
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Hatake Hishab</p>
          <h1>
            {mode === "reset"
              ? "Reset your password"
              : "Shared farm management"}
          </h1>
          <p>
            {mode === "reset"
              ? "Enter the email you signed up with and the password you want from now on. Nothing is emailed — you are signed straight in."
              : "Secure access for your farm team."}
          </p>
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
            <button
              className={mode === "reset" ? "active" : ""}
              onClick={() => setMode("reset")}
            >
              Forgot password
            </button>
          </div>
          <form onSubmit={authenticate} className="form">
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              {mode === "reset" ? "New password" : "Password"}
              <input name="password" type="password" minLength={8} required />
            </label>
            {mode === "reset" && (
              <label>
                Repeat new password
                <input name="confirm" type="password" minLength={8} required />
              </label>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signIn"
                  ? "Sign in"
                  : mode === "signUp"
                    ? "Create account"
                    : "Set new password"}
            </button>
            {mode === "signIn" && (
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode("reset");
                  setNotice("");
                }}
              >
                Forgot your password?
              </button>
            )}
          </form>
          {/* A recovery link opened in another browser or after it expired
              arrives without a session, so say what to do next. */}
          {recovery && (
            <p className="notice">
              That reset link could not be opened here — such links expire and
              work only in the browser that asked for them. Use{" "}
              <b>Forgot password</b> above instead; it needs no link.
            </p>
          )}
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
  const paidByMix = spendByPerson(entries);
  const paidByTotal = paidByMix.reduce(
    (total, [, amount]) => total + amount,
    0,
  );
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
  // The report reads either one month or the farm's whole history; every figure
  // below follows the same window so the sections always agree.
  const fullReport = reportScope === "all";
  const reportEntries = fullReport
    ? entries
    : entries.filter((entry) => entry.occurred_on.startsWith(reportMonth));
  const reportInvestments = fullReport
    ? investments
    : investments.filter((investment) =>
        investment.date.startsWith(reportMonth),
      );
  const sumOf = (rows: Entry[]) =>
    rows.reduce((total, entry) => total + Number(entry.amount ?? 0), 0);
  const reportSales = sumOf(
    reportEntries.filter((entry) => entry.kind === "sale"),
  );
  const reportMaterial = sumOf(
    reportEntries.filter((entry) => entry.kind === "expense"),
  );
  const reportLaborRows = reportEntries.filter(
    (entry) => entry.kind === "labor",
  );
  const reportLaborTotal = sumOf(reportLaborRows);
  // Travel is booked inside the labor amount, so the wage share is what is left.
  const reportTravel = reportLaborRows.reduce(
    (total, entry) =>
      total +
      Math.min(transportFromNote(entry.note), Number(entry.amount ?? 0)),
    0,
  );
  const reportWages = reportLaborTotal - reportTravel;
  const reportExpense = reportMaterial + reportLaborTotal;
  const reportHours = reportLaborRows.reduce(
    (total, entry) => total + Number(entry.quantity ?? 0),
    0,
  );
  const reportHarvest = reportEntries
    .filter((entry) => entry.kind === "harvest")
    .reduce((total, entry) => total + Number(entry.quantity ?? 0), 0);
  const reportPending = sumOf(
    reportEntries.filter(
      (entry) =>
        entry.kind === "sale" && /Payment:\s*Pending/i.test(entry.note ?? ""),
    ),
  );
  const reportInvested = reportInvestments.reduce(
    (total, item) => total + item.amount,
    0,
  );
  const reportSpenders = spendByPerson(reportEntries);
  const reportSpendTotal = reportSpenders.reduce(
    (total, [, amount]) => total + amount,
    0,
  );
  const reportCrops = [
    ...new Set(reportEntries.map((entry) => entry.crop).filter(Boolean)),
  ] as string[];
  const reportMembers = (() => {
    const members = new Map<
      string,
      {
        hours: number;
        wages: number;
        travel: number;
        investment: number;
        paid: number;
      }
    >();
    const getMember = (name: string) => {
      const key = name.trim() || "Unassigned";
      if (!members.has(key))
        members.set(key, {
          hours: 0,
          wages: 0,
          travel: 0,
          investment: 0,
          paid: 0,
        });
      return members.get(key)!;
    };
    reportLaborRows.forEach((entry) => {
      const name = entry.note?.match(/Member:\s*([^|]+)/i)?.[1] ?? "Unassigned";
      const item = getMember(name);
      const travel = Math.min(
        transportFromNote(entry.note),
        Number(entry.amount ?? 0),
      );
      item.hours += Number(entry.quantity ?? 0);
      item.travel += travel;
      item.wages += Number(entry.amount ?? 0) - travel;
    });
    spendByPerson(reportEntries).forEach(([name, amount]) => {
      getMember(name).paid += amount;
    });
    reportInvestments.forEach((investment) => {
      getMember(investment.member).investment += investment.amount;
    });
    return [...members.entries()]
      .map(([name, totals]) => ({
        name,
        ...totals,
        // What the member put into the farm: cash they paid out or invested.
        contribution: totals.paid + totals.investment,
      }))
      .sort((a, b) => b.contribution - a.contribution || b.hours - a.hours);
  })();
  // Every month that holds a record, newest first, for the full report.
  const reportMonths = [
    ...new Set(entries.map((entry) => entry.occurred_on.slice(0, 7))),
  ]
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const rows = entries.filter((entry) =>
        entry.occurred_on.startsWith(month),
      );
      const sales = sumOf(rows.filter((entry) => entry.kind === "sale"));
      const expense = sumOf(
        rows.filter(
          (entry) => entry.kind === "expense" || entry.kind === "labor",
        ),
      );
      return {
        month,
        sales,
        expense,
        harvest: rows
          .filter((entry) => entry.kind === "harvest")
          .reduce((total, entry) => total + Number(entry.quantity ?? 0), 0),
        profit: sales - expense,
      };
    });
  const capitalTotal = investments
    .filter((item) => item.type === "Capital")
    .reduce((total, item) => total + item.amount, 0);
  const text = interfaceText[language];
  const labor = laborText[language];
  const common = commonText[language];
  const handover = handoverText[language];
  const sales = salesText[language];
  const report = reportText[language];
  // "1 items" reads badly in English; Bengali and Japanese pass the same word
  // twice and stay unchanged.
  const count = (total: number, one: string, many: string) =>
    `${total} ${total === 1 ? one : many}`;
  const changeView = (next: View) => {
    setEditing(null);
    setEditingBatch(null);
    setEditingTask(null);
    setEditingHandover(null);
    resetSaleLines();
    setNotice("");
    setView(next);
  };
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    window.localStorage.setItem("hatake-hishab-language", next);
  };
  // Shown wherever a form or a delete button would sit for an editing member,
  // so a viewer sees why the page is only a page.
  const viewerNote =
    language === "bn"
      ? "আপনার অ্যাকাউন্ট শুধু দেখার জন্য। নতুন তথ্য যোগ বা পরিবর্তন করতে অ্যাডমিনকে বলুন।"
      : language === "ja"
        ? "このアカウントは閲覧専用です。追加や変更が必要な場合は管理者に依頼してください。"
        : "Your account is view-only. Ask an Admin if a record needs to be added or changed.";
  const viewerFlag =
    language === "bn"
      ? "শুধু দেখা"
      : language === "ja"
        ? "閲覧専用"
        : "View only";

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
          {readOnly && <em className="viewer-flag">{viewerFlag}</em>}
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
            {!readOnly && (
              <button
                className="finance-button"
                onClick={() => changeView("expense")}
              >
                {text.expense}
              </button>
            )}
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
              <SectionTitle
                title={common.spentBy}
                detail={`${yen(paidByTotal)} of ${yen(summary.expense)} total`}
              />
              <div className="expense-mix">
                {paidByMix.length ? (
                  paidByMix.map(([person, amount]) => (
                    <div className="expense-progress" key={person}>
                      <div>
                        <span>
                          {person}
                          {paidByTotal
                            ? ` — ${Math.round((amount / paidByTotal) * 100)}%`
                            : ""}
                        </span>
                        <b>{yen(amount)}</b>
                      </div>
                      <i>
                        <em
                          style={{
                            width: `${(amount / Math.max(1, paidByMix[0][1])) * 100}%`,
                          }}
                        />
                      </i>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">No expense records yet.</p>
                )}
              </div>
              <p className="small-pro">
                The remaining {yen(summary.expense - paidByTotal)} is wages and
                travel from the Labor &amp; Travel page — what the farm owes a
                member, not money they paid out, so nobody is charged for it
                here.
              </p>
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
                  onDelete={readOnly ? undefined : deleteEntry}
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
                {readOnly && <p className="small-pro">{viewerNote}</p>}
                {!readOnly && (
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
                    <CropSelect
                      name="crop"
                      label="Crop / ফসল"
                      options={knownCrops}
                      words={common}
                      emptyLabel="General / all crops"
                    />
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
                )}
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
                        {!readOnly && (
                          <button
                            className="table-delete"
                            onClick={() => removeCareAlert(alert.id)}
                          >
                            Done
                          </button>
                        )}
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
              {readOnly && <p className="small-pro">{viewerNote}</p>}
              {!readOnly && (
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
                  {view === "sales" || view === "expense" ? (
                    <div className="sale-lines full">
                      <div className="sale-lines-head">
                        <b>{view === "sales" ? sales.items : "খরচ আইটেম / Expense items"}</b>
                        <span>{view === "sales" ? sales.itemsHint : "এক সাথে বিভিন্ন বিভাগের খরচ যোগ করুন / Add different category expenses at once"}</span>
                      </div>
                      {(view === "sales" ? saleLines : expenseLines).map((line, index) => {
                        const saleLine = line as SaleLine;
                        const expenseLine = line as ExpenseLine;
                        return (
                          <div className="sale-line" key={line.id}>
                            <div className="sale-line-head">
                              <b>
                                {view === "sales" ? sales.item : "Item"} {index + 1}
                              </b>
                              {(view === "sales" ? saleLines : expenseLines).length > 1 && (
                                <button
                                  type="button"
                                  className="table-delete"
                                  onClick={() =>
                                    view === "sales"
                                      ? removeSaleLine(line.id)
                                      : removeExpenseLine(line.id)
                                  }
                                >
                                  {view === "sales" ? sales.remove : "Remove"}
                                </button>
                              )}
                            </div>
                            {view === "sales" ? (
                              <CropSelect
                                label={common.crop}
                                options={knownCrops}
                                words={common}
                                className="full"
                                required
                                value={saleLine.crop}
                                onChange={(crop) =>
                                  changeSaleLine(line.id, { crop })
                                }
                              />
                            ) : (
                              <label className="full">
                                {common.category}
                                <select
                                  required
                                  value={expenseLine.category}
                                  onChange={(event) =>
                                    changeExpenseLine(line.id, {
                                      category: event.target.value,
                                    })
                                  }
                                >
                                  <option value="" disabled>
                                    {language === "ja"
                                      ? "カテゴリーを選択"
                                      : language === "bn"
                                        ? "বিভাগ নির্বাচন করুন"
                                        : "Select category"}
                                  </option>
                                  {expenseCategories.map((category) => (
                                    <option key={category}>{category}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                            <label>
                              {common.amount}
                              <input
                                type="number"
                                min="0"
                                required
                                value={line.amount}
                                onChange={(event) =>
                                  (view === "sales" ? changeSaleLine : changeExpenseLine)(
                                    line.id,
                                    { amount: event.target.value }
                                  )
                                }
                              />
                            </label>
                            <label>
                              {common.quantity}
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.quantity}
                                onChange={(event) =>
                                  (view === "sales" ? changeSaleLine : changeExpenseLine)(
                                    line.id,
                                    { quantity: event.target.value }
                                  )
                                }
                              />
                            </label>
                            <label className="full">
                              {common.unit}
                              <input
                                placeholder="kg / pcs"
                                value={line.unit}
                                onChange={(event) =>
                                  (view === "sales" ? changeSaleLine : changeExpenseLine)(
                                    line.id,
                                    { unit: event.target.value }
                                  )
                                }
                              />
                            </label>
                          </div>
                        );
                      })}
                      {!editing && (
                        <button
                          type="button"
                          className="finance-button secondary"
                          onClick={view === "sales" ? addSaleLine : addExpenseLine}
                        >
                          {view === "sales" ? sales.addItem : "＋ Add another item"}
                        </button>
                      )}
                      <p className="sale-total">
                        <span>
                          {view === "sales" ? sales.total : "Total"} ·{" "}
                          {count(
                            (view === "sales" ? saleLines : expenseLines).length,
                            view === "sales" ? sales.itemWord : "item",
                            view === "sales" ? sales.itemsWord : "items"
                          )}
                        </span>
                        <b>{yen(view === "sales" ? saleLinesTotal : expenseLinesTotal)}</b>
                      </p>
                    </div>
                  ) : (
                    <>
                      <CropSelect
                        name="crop"
                        label={common.crop}
                        options={knownCrops}
                        words={common}
                        required
                        defaultValue={editing?.crop ?? ""}
                      />
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
                        {view === "harvest"
                          ? `${common.quantity} (${language === "ja" ? "任意" : language === "bn" ? "ঐচ্ছিক" : "optional"})`
                          : common.quantity}
                        <input
                          name="quantity"
                          type="number"
                          step="0.01"
                          min="0"
                          required={view === "harvest"}
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
                    </>
                  )}
                  {view === "expense" && (
                    <HolderSelect
                      name="paid_by"
                      label={common.paidBy}
                      options={knownHolders}
                      words={common}
                      required
                      placeholder="Rafi"
                      defaultValue={editing ? payerOf(editing) : ""}
                    />
                  )}
                  {view === "sales" && (
                    <>
                      {/* Full width: buyer names are long and the form column is
                        narrow, so a half-width dropdown would clip them. */}
                      <HolderSelect
                        name="customer"
                        label={common.customer}
                        options={knownCustomers}
                        words={common}
                        className="full"
                        placeholder="Community / Restaurant"
                        defaultValue={
                          editField("Customer") || editField("Buyer")
                        }
                      />
                      <label>
                        Channel
                        <select
                          name="channel"
                          defaultValue={
                            editing ? editField("Channel") : "Direct"
                          }
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
                      <HolderSelect
                        name="cash_with"
                        label={
                          language === "bn"
                            ? "টাকা কার কাছে"
                            : language === "ja"
                              ? "代金の保管者"
                              : "Cash with"
                        }
                        options={knownHolders}
                        words={common}
                        placeholder="Shakhawat"
                        defaultValue={editField("Cash with")}
                      />
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
                    {editing
                      ? "Update record"
                      : view === "sales" && saleLines.length > 1
                        ? `${common.save} · ${count(saleLines.length, sales.itemWord, sales.itemsWord)} · ${yen(saleLinesTotal)}`
                        : common.save}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="finance-button secondary full"
                      onClick={() => {
                        setEditing(null);
                        resetSaleLines();
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </form>
              )}
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
                  {cashInHand.some((holder) => holder.balance < 0) && (
                    <p className="small-pro">
                      {language === "bn"
                        ? "মাইনাস ব্যালেন্স মানে সদস্য নিজের পকেট থেকে খামারের খরচ দিয়েছে — খামার তার কাছে ওই টাকা ঋণী।"
                        : language === "ja"
                          ? "マイナスの残高は、そのメンバーが自己負担で農園の費用を払った分です。農園がその人に返すべき金額です。"
                          : "A negative balance means the member paid farm costs out of their own pocket — the farm owes them that much."}
                    </p>
                  )}
                  {!readOnly && (
                    <>
                      <SectionTitle
                        title={handover.title}
                        detail={handover.detail}
                      />
                      <form
                        className="finance-form"
                        onSubmit={saveHandover}
                        key={editingHandover?.id ?? "new-handover"}
                      >
                        <label>
                          {common.date}
                          <input
                            name="date"
                            type="date"
                            defaultValue={
                              editingHandover?.occurred_on ?? today()
                            }
                            required
                          />
                        </label>
                        <label>
                          {handover.amount}
                          <input
                            name="amount"
                            type="number"
                            min="1"
                            required
                            defaultValue={editingHandover?.amount ?? ""}
                          />
                        </label>
                        <HolderSelect
                          name="from_holder"
                          label={handover.from}
                          options={knownHolders}
                          words={common}
                          required
                          placeholder="Shakhawat"
                          defaultValue={editingHandover?.from_holder ?? ""}
                        />
                        <HolderSelect
                          name="to_holder"
                          label={handover.to}
                          options={knownHolders}
                          words={common}
                          required
                          placeholder="Bank"
                          defaultValue={editingHandover?.to_holder ?? ""}
                        />
                        <label className="full">
                          {common.note}
                          <input
                            name="note"
                            placeholder="Handed over at the field"
                            defaultValue={editingHandover?.note ?? ""}
                          />
                        </label>
                        <button className="finance-button full" disabled={busy}>
                          {editingHandover ? handover.update : handover.save}
                        </button>
                        {editingHandover && (
                          <button
                            type="button"
                            className="finance-button secondary full"
                            onClick={() => setEditingHandover(null)}
                          >
                            {handover.cancel}
                          </button>
                        )}
                        <p className="small-pro full">{handover.hint}</p>
                      </form>
                    </>
                  )}
                  <SectionTitle
                    title={handover.records}
                    detail={`${handovers.length} ${common.records}`}
                  />
                  <div className="summary-list">
                    {handovers.length ? (
                      handovers.map((record) => (
                        <p className="crop-row" key={record.id}>
                          <span>
                            <b>
                              {record.from_holder} → {record.to_holder}
                            </b>
                            <small>
                              {record.occurred_on}
                              {record.note ? ` · ${record.note}` : ""}
                            </small>
                          </span>
                          <span className="table-actions">
                            <b>{yen(Number(record.amount ?? 0))}</b>
                            {!readOnly && (
                              <>
                                <button
                                  type="button"
                                  className="table-edit"
                                  disabled={busy}
                                  onClick={() => startHandoverEdit(record)}
                                >
                                  {editingHandover?.id === record.id
                                    ? "Editing…"
                                    : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  className="table-delete"
                                  disabled={busy}
                                  onClick={() => void deleteHandover(record.id)}
                                >
                                  {common.delete}
                                </button>
                              </>
                            )}
                          </span>
                        </p>
                      ))
                    ) : (
                      <p className="empty-copy">{handover.none}</p>
                    )}
                  </div>
                </>
              )}
            </article>
            <article className="finance-card">
              {view === "sales" && (
                <div className="customer-dash">
                  <SectionTitle
                    title={sales.customers}
                    detail={sales.customersDetail}
                  />
                  {customers.length ? (
                    <>
                      <div className="customer-tiles">
                        <article>
                          <span>{sales.buyers}</span>
                          <b>{customers.length}</b>
                          <small>
                            {count(
                              customers.reduce(
                                (total, customer) => total + customer.visits,
                                0,
                              ),
                              sales.visit,
                              sales.visits,
                            )}
                          </small>
                        </article>
                        <article>
                          <span>{sales.topBuyer}</span>
                          <b>{topCustomer.name}</b>
                          <small>
                            {yen(topCustomer.total)} ·{" "}
                            {count(
                              topCustomer.visits,
                              sales.visit,
                              sales.visits,
                            )}
                          </small>
                        </article>
                        <article>
                          <span>{sales.repeat}</span>
                          <b>
                            {
                              customers.filter(
                                (customer) => customer.visits > 1,
                              ).length
                            }
                          </b>
                          <small>
                            {sales.total} {yen(customerSales)}
                          </small>
                        </article>
                        <article
                          className={
                            customers.some((customer) => customer.pending > 0)
                              ? "tile-warn"
                              : ""
                          }
                        >
                          <span>{sales.unpaid}</span>
                          <b>
                            {yen(
                              customers.reduce(
                                (total, customer) => total + customer.pending,
                                0,
                              ),
                            )}
                          </b>
                          <small>
                            {count(
                              customers.filter(
                                (customer) => customer.pending > 0,
                              ).length,
                              sales.buyer,
                              sales.buyer,
                            )}
                          </small>
                        </article>
                      </div>
                      <input
                        className="customer-search"
                        value={customerQuery}
                        onChange={(event) =>
                          setCustomerQuery(event.target.value)
                        }
                        placeholder={sales.search}
                        aria-label={sales.search}
                      />
                      <div className="customer-list">
                        {shownCustomers.map((customer) => {
                          const open = openCustomer === customer.key;
                          return (
                            <article
                              className={
                                open ? "customer-card open" : "customer-card"
                              }
                              key={customer.key}
                            >
                              <button
                                type="button"
                                className="customer-head"
                                onClick={() =>
                                  setOpenCustomer(open ? null : customer.key)
                                }
                              >
                                <span className="customer-avatar">
                                  {initialsOf(customer.name)}
                                </span>
                                <span className="customer-name">
                                  <b>{customer.name}</b>
                                  <small>
                                    {count(
                                      customer.visits,
                                      sales.visit,
                                      sales.visits,
                                    )}{" "}
                                    ·{" "}
                                    {count(
                                      customer.items,
                                      sales.itemWord,
                                      sales.itemsWord,
                                    )}{" "}
                                    · {sales.lastBuy} {customer.lastDate}
                                  </small>
                                  <i className="customer-share">
                                    <em
                                      style={{
                                        width: `${Math.max(3, (customer.total / Math.max(1, customers[0].total)) * 100)}%`,
                                      }}
                                    />
                                  </i>
                                </span>
                                <span className="customer-money">
                                  <b>{yen(customer.total)}</b>
                                  <small>
                                    {customerSales
                                      ? `${Math.round((customer.total / customerSales) * 100)}% ${sales.share}`
                                      : sales.share}
                                  </small>
                                  {customer.pending > 0 && (
                                    <em>
                                      {sales.pending} {yen(customer.pending)}
                                    </em>
                                  )}
                                </span>
                                <span className="customer-toggle">
                                  {open ? sales.close : sales.open}
                                </span>
                              </button>
                              {open && (
                                <div className="customer-body">
                                  <div className="customer-crops">
                                    <span className="customer-crops-label">
                                      {sales.mostBought}
                                    </span>
                                    {customer.crops
                                      .slice(0, 5)
                                      .map(([crop, amount]) => (
                                        <span
                                          className="customer-crop"
                                          key={crop}
                                        >
                                          {crop} <b>{yen(amount)}</b>
                                        </span>
                                      ))}
                                  </div>
                                  <SectionTitle
                                    title={sales.bills}
                                    detail={sales.billsDetail}
                                  />
                                  <div className="summary-list bill-list">
                                    {customer.bills.map((bill) => (
                                      <p className="crop-row" key={bill.key}>
                                        <span>
                                          <b>
                                            {bill.date} ·{" "}
                                            {count(
                                              bill.items.length,
                                              sales.itemWord,
                                              sales.itemsWord,
                                            )}
                                            {bill.pending
                                              ? ` · ${sales.pending}`
                                              : ""}
                                          </b>
                                          <small>{bill.items.join(", ")}</small>
                                        </span>
                                        <b>{yen(bill.total)}</b>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </article>
                          );
                        })}
                        {!shownCustomers.length && (
                          <p className="empty-copy">{common.noRecords}</p>
                        )}
                      </div>
                      {!customerQuery && matchedCustomers.length > 8 && (
                        <button
                          type="button"
                          className="finance-button secondary customer-more"
                          onClick={() => setAllCustomers(!allCustomers)}
                        >
                          {allCustomers
                            ? sales.showTop
                            : `${sales.showAll} (${matchedCustomers.length})`}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="empty-copy">{sales.noCustomer}</p>
                  )}
                </div>
              )}
              <SectionTitle
                title={`${labels[language][view]} ${language === "ja" ? "詳細" : language === "bn" ? "বিবরণ" : "details"}`}
                detail={common.records}
              />
              <div className="sales-filter">
                <div className="filter-group">
                  <label>
                    {common.crop}
                    <select
                      value={filterCrop}
                      onChange={(e) => setFilterCrop(e.target.value)}
                    >
                      <option value="">— All —</option>
                      {knownCrops.map((crop) => (
                        <option key={crop} value={crop}>
                          {crop}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {common.customer}
                    <input
                      type="text"
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      placeholder="Search customer..."
                    />
                  </label>
                  <label>
                    {common.amount} (Min)
                    <input
                      type="number"
                      value={filterMinAmount}
                      onChange={(e) => setFilterMinAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </label>
                  <label>
                    {common.amount} (Max)
                    <input
                      type="number"
                      value={filterMaxAmount}
                      onChange={(e) => setFilterMaxAmount(e.target.value)}
                      placeholder="—"
                      min="0"
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setFilterCrop("");
                      setFilterCustomer("");
                      setFilterMinAmount("");
                      setFilterMaxAmount("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <EntriesTable
                entries={displayedEntries}
                busy={busy}
                onDelete={readOnly ? undefined : deleteEntry}
                onEdit={readOnly ? undefined : startEdit}
                editingId={editing?.id}
              />
            </article>
          </section>
        )}

        {view === "labor" && (
          <section className="entry-page">
            <article className="finance-card entry-card">
              <SectionTitle title={labor.title} detail={labor.detail} />
              {readOnly && <p className="small-pro">{viewerNote}</p>}
              {!readOnly && (
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
                  <CropSelect
                    name="crop"
                    label={labor.crop}
                    options={knownCrops}
                    words={common}
                    defaultValue={editing?.crop ?? ""}
                    emptyLabel={
                      language === "ja"
                        ? "一般"
                        : language === "bn"
                          ? "সাধারণ"
                          : "General"
                    }
                  />
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
              )}
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
                            {!readOnly && (
                              <div className="table-actions">
                                <button
                                  className="table-edit"
                                  disabled={busy}
                                  onClick={() => startEdit(entry)}
                                >
                                  {editing?.id === entry.id
                                    ? "Editing…"
                                    : "Edit"}
                                </button>
                                <button
                                  className="table-delete"
                                  disabled={busy}
                                  onClick={() => void deleteEntry(entry.id)}
                                >
                                  {labor.remove}
                                </button>
                              </div>
                            )}
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
              {readOnly && <p className="small-pro">{viewerNote}</p>}
              {!readOnly && (
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
                  <CropSelect
                    name="crop"
                    label={common.crop}
                    options={knownCrops}
                    words={common}
                    required
                    defaultValue={editingBatch?.crop ?? ""}
                  />
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
              )}
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
            {!readOnly && (
              <article className="finance-card entry-card">
                <SectionTitle
                  title={
                    editingTask ? "Edit Farm Task" : "Add Custom Farm Task"
                  }
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
            )}
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
                      {!readOnly && <th>Actions</th>}
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
                            {!readOnly && (
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
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={readOnly ? 5 : 6}>
                          No planned tasks yet.
                        </td>
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
                      {!readOnly && <th>Actions</th>}
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
                            {!readOnly && (
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
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={readOnly ? 7 : 8}>No crop batches yet.</td>
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
            {!readOnly && (
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
                  <CropSelect
                    name="crop"
                    label={common.crop}
                    options={knownCrops}
                    words={common}
                    emptyLabel={common.selectCrop}
                  />
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
            )}
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
              {readOnly && <p className="small-pro">{viewerNote}</p>}
              {!readOnly && (
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
              )}
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
              {readOnly && <p className="small-pro">{viewerNote}</p>}
              {!readOnly && (
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
                  <button className="finance-button full">
                    Save investment
                  </button>
                </form>
              )}
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
                            {!readOnly && (
                              <button
                                className="table-delete"
                                onClick={() => removeInvestment(item.id)}
                              >
                                Delete
                              </button>
                            )}
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

        {view === "bills" && (
          <section className="finance-card">
            <h2>📄 {language === "bn" ? "বিল" : language === "ja" ? "請求書" : "Bills"}</h2>

            {/* Manual Bill Creation */}
            {!selectedBill && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createManualBill(e);
              }}
              style={{ marginBottom: "30px", padding: "20px", background: "#f8f9fa", borderRadius: "8px" }}
            >
              <h3>{language === "bn" ? "ম্যানুয়াল বিল তৈরি করুন" : language === "ja" ? "手動請求書を作成" : "Create Manual Bill"}</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <label style={{ display: "block" }}>
                  {language === "bn" ? "গ্রাহক নাম" : language === "ja" ? "顧客名" : "Customer Name"}
                  <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
                    <select
                      name="customer_name"
                      required
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setShowNewCustomerInput(true);
                          setNewCustomerName("");
                        } else {
                          setShowNewCustomerInput(false);
                          setNewCustomerName(e.target.value);
                        }
                      }}
                      onClick={() => {
                        if (existingCustomers.length === 0) {
                          loadExistingCustomers();
                        }
                      }}
                      style={{ flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    >
                      <option value="">{language === "bn" ? "গ্রাহক নির্বাচন" : language === "ja" ? "顧客を選択" : "Select customer"}</option>
                      {existingCustomers.map((cust) => (
                        <option key={cust} value={cust}>{cust}</option>
                      ))}
                      <option value="new">{language === "bn" ? "➕ নতুন গ্রাহক" : language === "ja" ? "➕ 新規顧客" : "➕ New Customer"}</option>
                    </select>
                    {showNewCustomerInput && (
                      <input
                        type="text"
                        placeholder={language === "bn" ? "গ্রাহক নাম" : language === "ja" ? "顧客名" : "Customer name"}
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        style={{ flex: 1, padding: "8px", border: "1px solid #ffc107", borderRadius: "4px", background: "#fffef0" }}
                        required={showNewCustomerInput}
                      />
                    )}
                  </div>
                </label>
                <label style={{ display: "block" }}>
                  {language === "bn" ? "বিল তারিখ" : language === "ja" ? "請求日" : "Bill Date"}
                  <input
                    name="bill_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    style={{ width: "100%", marginTop: "5px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  />
                </label>
              </div>

              <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>
                {language === "bn" ? "ফসল / পণ্য যোগ করুন" : language === "ja" ? "作物/商品を追加" : "Add Crops / Products"}
              </h4>

              <div style={{ overflowX: "auto", marginBottom: "15px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#e7f3ff", borderBottom: "2px solid #667eea" }}>
                      <th style={{ padding: "10px", textAlign: "left" }}>{language === "bn" ? "ফসল" : language === "ja" ? "作物" : "Crop"}</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>{language === "bn" ? "পরিমাণ" : language === "ja" ? "数量" : "Qty"}</th>
                      <th style={{ padding: "10px", textAlign: "left" }}>{language === "bn" ? "একক" : language === "ja" ? "単位" : "Unit"}</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>{language === "bn" ? "দাম" : language === "ja" ? "価格" : "Price"}</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>{language === "bn" ? "মোট" : language === "ja" ? "合計" : "Total"}</th>
                      <th style={{ padding: "10px" }}>{language === "bn" ? "কর্ম" : language === "ja" ? "アクション" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualBillItems.map((item, idx) => {
                      const qty = Number(item.quantity) || 0;
                      const price = Number(item.price) || 0;
                      const total = qty * price;
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                          <td style={{ padding: "8px" }}>
                            <select
                              name={`item_crop_${idx}`}
                              value={item.crop}
                              onChange={(e) => {
                                const newItems = [...manualBillItems];
                                newItems[idx].crop = e.target.value;
                                setManualBillItems(newItems);
                              }}
                              onClick={() => {
                                if (allCrops.length === 0) {
                                  loadAllCrops();
                                }
                              }}
                              style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                              required
                            >
                              <option value="">{language === "bn" ? "ফসল নির্বাচন" : language === "ja" ? "作物を選択" : "Select crop"}</option>
                              {allCrops.map((crop) => (
                                <option key={crop} value={crop}>{crop}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <input
                              name={`item_qty_${idx}`}
                              type="number"
                              placeholder="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...manualBillItems];
                                newItems[idx].quantity = e.target.value;
                                setManualBillItems(newItems);
                              }}
                              style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <input
                              name={`item_unit_${idx}`}
                              type="text"
                              placeholder="pcs, kg, box"
                              value={item.unit}
                              onChange={(e) => {
                                const newItems = [...manualBillItems];
                                newItems[idx].unit = e.target.value;
                                setManualBillItems(newItems);
                              }}
                              style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <input
                              name={`item_price_${idx}`}
                              type="number"
                              placeholder="0"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...manualBillItems];
                                newItems[idx].price = e.target.value;
                                setManualBillItems(newItems);
                              }}
                              style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                            />
                          </td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                            ¥{total.toLocaleString()}
                          </td>
                        <td style={{ padding: "8px" }}>
                          {manualBillItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setManualBillItems(manualBillItems.filter((_,i) => i !== idx))}
                              style={{ padding: "4px 8px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85em" }}
                            >
                              {language === "bn" ? "মুছুন" : language === "ja" ? "削除" : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setManualBillItems([...manualBillItems, { id: ++lastManualBillLineId.current, crop: "", quantity: "", unit: "", price: "", amount: "" }]);
                  }}
                  style={{ flex: 1, padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  {language === "bn" ? "+ আইটেম যোগ করুন" : language === "ja" ? "+ 行を追加" : "+ Add Line"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (allCrops.length === 0) {
                      loadAllCrops();
                    }
                    const newItems = allCrops.map(crop => ({
                      id: ++lastManualBillLineId.current,
                      crop,
                      quantity: "",
                      unit: "",
                      price: "",
                      amount: ""
                    }));
                    setManualBillItems([...manualBillItems, ...newItems]);
                  }}
                  style={{ flex: 1, padding: "8px 16px", background: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  title={language === "bn" ? "সব ফসল একসাথে যোগ করুন" : language === "ja" ? "すべての作物を追加" : "Add all crops at once"}
                >
                  {language === "bn" ? "🌾 সব ফসল যোগ করুন" : language === "ja" ? "🌾 全て追加" : "🌾 Add All Crops"}
                </button>
              </div>

              {/* Discount Section */}
              <div style={{ padding: "15px", background: "#fff3e0", borderRadius: "4px", marginBottom: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0" }}>
                  {language === "bn" ? "ছাড় (ঐচ্ছিক)" : language === "ja" ? "割引（オプション）" : "Discount (Optional)"}
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "block" }}>
                    {language === "bn" ? "ছাড়ের ধরন:" : language === "ja" ? "割引タイプ:" : "Type:"}
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                      style={{ width: "100%", marginTop: "5px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    >
                      <option value="percentage">{language === "bn" ? "শতাংশ (%)" : language === "ja" ? "パーセンテージ" : "Percentage (%)"}</option>
                      <option value="fixed">{language === "bn" ? "নির্দিষ্ট পরিমাণ" : language === "ja" ? "固定金額" : "Fixed Amount"}</option>
                    </select>
                  </label>
                  <label style={{ display: "block" }}>
                    {discountType === "percentage" ? "%" : "¥"}
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={billDiscount}
                      onChange={(e) => setBillDiscount(e.target.value)}
                      style={{ width: "100%", marginTop: "5px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                    />
                  </label>
                </div>
              </div>

              {/* Total with Discount */}
              {manualBillItems.filter(i => i.crop && (Number(i.price) > 0 || Number(i.quantity) > 0)).length > 0 && (
                <div style={{ padding: "15px", background: "#e7f3ff", borderRadius: "4px", marginBottom: "15px", fontSize: "0.9em" }}>
                  {(() => {
                    const subtotal = manualBillItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
                    let discount = 0;
                    if (billDiscount) {
                      discount = discountType === "percentage" ? (subtotal * Number(billDiscount)) / 100 : Number(billDiscount);
                    }
                    const total = subtotal - discount;
                    return (
                      <>
                        <p style={{ margin: "0 0 5px 0" }}>
                          <strong>{language === "bn" ? "মোট:" : language === "ja" ? "小計:" : "Subtotal:"}</strong> ¥{subtotal.toLocaleString()}
                        </p>
                        {discount > 0 && (
                          <p style={{ margin: "0 0 5px 0", color: "#dc3545" }}>
                            <strong>{language === "bn" ? "ছাড়:" : language === "ja" ? "割引:" : "Discount:"}</strong> -¥{discount.toLocaleString()}
                          </p>
                        )}
                        <p style={{ margin: "0", fontSize: "1.1em" }}>
                          <strong>{language === "bn" ? "চূড়ান্ত মোট:" : language === "ja" ? "合計:" : "Final Total:"}</strong> ¥{total.toLocaleString()}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || manualBillItems.filter(i => i.crop && (Number(i.price) > 0 || Number(i.quantity) > 0)).length === 0}
                className="finance-button primary"
                style={{ width: "100%" }}
              >
                {language === "bn" ? "বিল তৈরি করুন" : language === "ja" ? "請求書を作成" : "Create Bill"}
              </button>
            </form>
            )}

            {/* Bills List */}
            <div style={{ overflowX: "auto", marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#667eea", color: "white" }}>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {language === "bn" ? "বিল নম্বর" : language === "ja" ? "請求書番号" : "Bill #"}
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {language === "bn" ? "গ্রাহক" : language === "ja" ? "顧客" : "Customer"}
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {language === "bn" ? "তারিখ" : language === "ja" ? "日付" : "Date"}
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {language === "bn" ? "মোট" : language === "ja" ? "合計" : "Total"}
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {language === "bn" ? "প্রদত্ত" : language === "ja" ? "支払済み" : "Paid"}
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {language === "bn" ? "অবস্থা" : language === "ja" ? "ステータス" : "Status"}
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                      {language === "bn" ? "পদক্ষেপ" : language === "ja" ? "アクション" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "12px" }}>{bill.bill_number}</td>
                      <td style={{ padding: "12px" }}>{bill.customer_name}</td>
                      <td style={{ padding: "12px" }}>{bill.bill_date}</td>
                      <td style={{ padding: "12px" }}>¥{bill.total_amount.toLocaleString()}</td>
                      <td style={{ padding: "12px" }}>¥{bill.paid_amount.toLocaleString()}</td>
                      <td style={{ padding: "12px" }}>
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
                            fontSize: "0.9em",
                          }}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={async () => {
                            setSelectedBill(bill);
                            if (supabase) {
                              const { data: items } = await supabase
                                .from("bill_items")
                                .select("*")
                                .eq("bill_id", bill.id);
                              if (items) {
                                (bill as any).__items = items;
                              }
                            }
                          }}
                          style={{ marginRight: "5px", padding: "5px 10px", background: "#667eea", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.9em" }}
                        >
                          {language === "bn" ? "দেখুন" : language === "ja" ? "表示" : "View"}
                        </button>
                        {!readOnly && (
                          <>
                            <button
                              onClick={async () => {
                                setEditingBillId(bill.id);
                                if (supabase) {
                                  const { data: items } = await supabase
                                    .from("bill_items")
                                    .select("*")
                                    .eq("bill_id", bill.id);
                                  if (items) {
                                    setEditBillItems(items.map((item: any) => ({
                                      id: Math.random(),
                                      crop: item.description,
                                      quantity: String(item.quantity),
                                      unit: item.unit || "",
                                      price: String(item.unit_price),
                                      amount: String(item.amount)
                                    })));
                                  }
                                }
                              }}
                              style={{ marginRight: "5px", padding: "5px 10px", background: "#ffc107", color: "black", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.9em" }}
                            >
                              {language === "bn" ? "সম্পাদনা" : language === "ja" ? "編集" : "Edit"}
                            </button>
                            <button
                              onClick={() => deleteBill(bill.id)}
                              disabled={busy}
                              style={{ padding: "5px 10px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.9em" }}
                            >
                              {language === "bn" ? "মুছুন" : language === "ja" ? "削除" : "Delete"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bills.length === 0 && (
                <p style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                  {language === "bn" ? "কোন বিল নেই" : language === "ja" ? "請求書がありません" : "No bills yet"}
                </p>
              )}
            </div>

            {/* Selected Bill Detail */}
            {selectedBill && (
              <div style={{ padding: "20px", background: "#f8f9fa", borderRadius: "8px" }}>
                <h3>Bill #{selectedBill.bill_number}</h3>
                <p><strong>{language === "bn" ? "গ্রাহক:" : language === "ja" ? "顧客:" : "Customer:"}</strong> {selectedBill.customer_name}</p>
                <p><strong>{language === "bn" ? "তারিখ:" : language === "ja" ? "日付:" : "Date:"}</strong> {selectedBill.bill_date}</p>
                <p><strong>{language === "bn" ? "মোট:" : language === "ja" ? "合計:" : "Total:"}</strong> ¥{selectedBill.total_amount.toLocaleString()}</p>
                <p><strong>{language === "bn" ? "প্রদত্ত:" : language === "ja" ? "支払済み:" : "Paid:"}</strong> ¥{selectedBill.paid_amount.toLocaleString()}</p>
                <p><strong>{language === "bn" ? "বাকি:" : language === "ja" ? "残り:" : "Due:"}</strong> ¥{(selectedBill.total_amount - selectedBill.paid_amount).toLocaleString()}</p>

                {/* Bill Items Table */}
                {(selectedBill as any).__items && (selectedBill as any).__items.length > 0 && (
                  <div style={{ marginTop: "20px", overflowX: "auto" }}>
                    <h4 style={{ marginBottom: "10px" }}>
                      {language === "bn" ? "পণ্য:" : language === "ja" ? "商品:" : "Items:"}
                    </h4>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                      <thead>
                        <tr style={{ background: "#e7f3ff", borderBottom: "2px solid #667eea" }}>
                          <th style={{ padding: "10px", textAlign: "left", borderRight: "1px solid #ddd" }}>
                            {language === "bn" ? "পণ্য" : language === "ja" ? "商品" : "Item"}
                          </th>
                          <th style={{ padding: "10px", textAlign: "right", borderRight: "1px solid #ddd" }}>
                            {language === "bn" ? "পরিমাণ" : language === "ja" ? "数量" : "Qty"}
                          </th>
                          <th style={{ padding: "10px", textAlign: "right" }}>
                            {language === "bn" ? "মূল্য" : language === "ja" ? "価格" : "Amount"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedBill as any).__items.map((item: BillItem, idx: number) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                            <td style={{ padding: "10px", borderRight: "1px solid #ddd" }}>{item.description}</td>
                            <td style={{ padding: "10px", textAlign: "right", borderRight: "1px solid #ddd" }}>{item.quantity} {item.unit}</td>
                            <td style={{ padding: "10px", textAlign: "right" }}>¥{item.amount?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Status Update */}
                {!readOnly && (
                  <div style={{ marginTop: "20px" }}>
                    <label style={{ display: "block", marginBottom: "10px" }}>
                      {language === "bn" ? "অবস্থা আপডেট করুন:" : language === "ja" ? "ステータスを更新:" : "Update Status:"}
                      <select
                        value={selectedBill.status}
                        onChange={(e) => updateBillStatus(selectedBill.id, e.target.value)}
                        style={{ width: "100%", marginTop: "5px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                      >
                        <option value="draft">Draft</option>
                        <option value="issued">Issued</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </label>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <button
                    onClick={async () => {
                      const billItems = (selectedBill as any).__items || [];
                      await downloadBillPDF(selectedBill, billItems);
                    }}
                    style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", flex: 1 }}
                  >
                    {language === "bn" ? "📥 PDF ডাউনলোড" : language === "ja" ? "📥 PDF ダウンロード" : "📥 Download PDF"}
                  </button>
                  <button
                    onClick={() => setSelectedBill(null)}
                    style={{ padding: "8px 16px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", flex: 1 }}
                  >
                    {language === "bn" ? "বন্ধ করুন" : language === "ja" ? "閉じる" : "Close"}
                  </button>
                </div>
              </div>
            )}

            {/* Edit Bill Mode */}
            {editingBillId && (
              <div style={{ padding: "20px", background: "#f8f9fa", borderRadius: "8px", marginTop: "20px" }}>
                <h3>Edit Bill</h3>
                <div style={{ overflowX: "auto", marginBottom: "15px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#e7f3ff", borderBottom: "2px solid #667eea" }}>
                        <th style={{ padding: "10px", textAlign: "left" }}>Item</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>Qty</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Unit</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>Price</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>Total</th>
                        <th style={{ padding: "10px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editBillItems.map((item, idx) => {
                        const qty = Number(item.quantity) || 0;
                        const price = Number(item.price) || 0;
                        const total = qty * price;
                        return (
                          <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                value={item.crop}
                                onChange={(e) => {
                                  const newItems = [...editBillItems];
                                  newItems[idx].crop = e.target.value;
                                  setEditBillItems(newItems);
                                }}
                                style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...editBillItems];
                                  newItems[idx].quantity = e.target.value;
                                  setEditBillItems(newItems);
                                }}
                                style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => {
                                  const newItems = [...editBillItems];
                                  newItems[idx].unit = e.target.value;
                                  setEditBillItems(newItems);
                                }}
                                style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => {
                                  const newItems = [...editBillItems];
                                  newItems[idx].price = e.target.value;
                                  setEditBillItems(newItems);
                                }}
                                style={{ width: "100%", padding: "6px", border: "1px solid #ddd", borderRadius: "4px" }}
                              />
                            </td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                              ¥{total.toLocaleString()}
                            </td>
                            <td style={{ padding: "8px" }}>
                              <button
                                type="button"
                                onClick={() => setEditBillItems(editBillItems.filter((_, i) => i !== idx))}
                                style={{ padding: "4px 8px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85em" }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Edit Discount */}
                <div style={{ padding: "15px", background: "#fff3e0", borderRadius: "4px", marginBottom: "15px" }}>
                  <h4 style={{ margin: "0 0 10px 0" }}>Discount</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <label style={{ display: "block" }}>
                      Type:
                      <select
                        value={editDiscountType}
                        onChange={(e) => setEditDiscountType(e.target.value as "percentage" | "fixed")}
                        style={{ width: "100%", marginTop: "5px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </label>
                    <label style={{ display: "block" }}>
                      {editDiscountType === "percentage" ? "%" : "¥"}
                      <input
                        type="number"
                        min="0"
                        value={editBillDiscount}
                        onChange={(e) => setEditBillDiscount(e.target.value)}
                        style={{ width: "100%", marginTop: "5px", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={async () => {
                      if (!supabase || !selectedBill) return;
                      setBusy(true);

                      const subtotal = editBillItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
                      let discount = 0;
                      if (editBillDiscount) {
                        discount = editDiscountType === "percentage" ? (subtotal * Number(editBillDiscount)) / 100 : Number(editBillDiscount);
                      }
                      const finalTotal = Math.max(0, subtotal - discount);

                      // Update bill total
                      const billResult = await supabase
                        .from("bills")
                        .update({ total_amount: finalTotal })
                        .eq("id", editingBillId);

                      if (!billResult.error) {
                        // Delete old items
                        await supabase.from("bill_items").delete().eq("bill_id", editingBillId);

                        // Insert new items
                        const billItems = editBillItems.map((item) => ({
                          bill_id: editingBillId,
                          description: item.crop,
                          quantity: Number(item.quantity),
                          unit: item.unit,
                          unit_price: Number(item.price),
                          amount: (Number(item.quantity) || 0) * (Number(item.price) || 0),
                        }));
                        await supabase.from("bill_items").insert(billItems);

                        setNotice("Bill updated successfully!");
                        setEditingBillId(null);
                        await loadWorkspace();
                      }
                      setBusy(false);
                    }}
                    style={{ flex: 1, padding: "10px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingBillId(null)}
                    style={{ flex: 1, padding: "10px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {view === "summary" && (
          <section className="finance-card" style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ marginBottom: "20px", color: "#1e7048", fontSize: "24px" }}>📊 {language === "bn" ? "বিক্রি সারসংক্ষেপ" : language === "ja" ? "販売サマリー" : "Sales Summary"}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
                <label style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    {language === "bn" ? "শুরু তারিখ" : language === "ja" ? "開始日" : "📅 Start Date"}
                  </span>
                  <input
                    type="date"
                    value={summaryStartDate}
                    onChange={(e) => setSummaryStartDate(e.target.value)}
                    style={{ width: "100%", marginTop: "0px", padding: "10px 12px", border: "2px solid #e0e0e0", borderRadius: "6px", fontSize: "14px" }}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#555", marginBottom: "6px" }}>
                    {language === "bn" ? "শেষ তারিখ" : language === "ja" ? "終了日" : "📅 End Date"}
                  </span>
                  <input
                    type="date"
                    value={summaryEndDate}
                    onChange={(e) => setSummaryEndDate(e.target.value)}
                    style={{ width: "100%", marginTop: "0px", padding: "10px 12px", border: "2px solid #e0e0e0", borderRadius: "6px", fontSize: "14px" }}
                  />
                </label>
              </div>
            </div>

            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "20px",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}>
              <thead>
                <tr style={{
                  background: "linear-gradient(135deg, #1e7048 0%, #2d9666 100%)",
                  borderBottom: "3px solid #1e7048"
                }}>
                  <th style={{
                    padding: "16px 20px",
                    textAlign: "left",
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "#fff",
                    letterSpacing: "0.5px"
                  }}>
                    👤 {language === "bn" ? "গ্রাহক" : language === "ja" ? "顧客" : "Customer"}
                  </th>
                  <th style={{
                    padding: "16px 20px",
                    textAlign: "right",
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "#fff",
                    letterSpacing: "0.5px"
                  }}>
                    💰 {language === "bn" ? "বিক্রয়" : language === "ja" ? "売上" : "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summaryByCustomer).map(([customer, amount], idx) => {
                  const colors = ["#fff", "#f0f7f4"];
                  const hoverColor = "#e8f5f0";
                  return (
                    <tr
                      key={customer}
                      style={{
                        borderBottom: "1px solid #e8e8e8",
                        backgroundColor: colors[idx % 2],
                        transition: "all 0.3s ease",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = hoverColor;
                        e.currentTarget.style.boxShadow = "inset 3px 0 0 #1e7048";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors[idx % 2];
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <td style={{
                        padding: "16px 20px",
                        fontSize: "15px",
                        color: "#1e7048",
                        fontWeight: "600"
                      }}>
                        {customer}
                      </td>
                      <td style={{
                        padding: "16px 20px",
                        textAlign: "right",
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#1e7048"
                      }}>
                        ¥{amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{
                  borderTop: "3px solid #1e7048",
                  background: "linear-gradient(135deg, #f0f7f4 0%, #e8f5f0 100%)",
                  fontWeight: "bold"
                }}>
                  <td style={{
                    padding: "18px 20px",
                    fontSize: "15px",
                    color: "#1e7048",
                    fontWeight: "700"
                  }}>
                    📊 {language === "bn" ? "মোট" : language === "ja" ? "合計" : "Total"}
                  </td>
                  <td style={{
                    padding: "18px 20px",
                    textAlign: "right",
                    fontSize: "18px",
                    color: "#1e7048",
                    fontWeight: "700"
                  }}>
                    ¥{summaryTotal.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {view === "reports" && (
          <section className="finance-card report-page">
            <SectionTitle
              title={labels[language].reports}
              detail={fullReport ? report.allDetail : report.monthDetail}
            />
            <div className="report-controls">
              <div className="report-scope">
                <button
                  type="button"
                  className={fullReport ? "" : "active"}
                  onClick={() => setReportScope("month")}
                >
                  {report.monthScope}
                </button>
                <button
                  type="button"
                  className={fullReport ? "active" : ""}
                  onClick={() => setReportScope("all")}
                >
                  {report.allScope}
                </button>
              </div>
              {fullReport ? (
                <p className="report-window">
                  <b>{report.allTime}</b>
                  {reportMonths.length ? (
                    <small>
                      {report.first}:{" "}
                      {monthName(
                        reportMonths[reportMonths.length - 1].month,
                        language,
                      )}{" "}
                      ·{" "}
                      {count(
                        reportMonths.length,
                        report.monthWord,
                        report.months,
                      )}
                    </small>
                  ) : null}
                </p>
              ) : (
                <label>
                  {report.month}
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(event) => setReportMonth(event.target.value)}
                  />
                </label>
              )}
              <div className="report-actions">
                <button
                  className="finance-button secondary"
                  onClick={() => void loadWorkspace()}
                >
                  {report.refresh}
                </button>
                <button
                  className="finance-button secondary"
                  onClick={() => window.print()}
                >
                  {report.print}
                </button>
              </div>
            </div>
            <div className="report-metrics">
              <Metric
                label={report.sales}
                value={yen(reportSales)}
                note={
                  fullReport ? report.allTime : monthName(reportMonth, language)
                }
              />
              <Metric
                label={report.expense}
                value={yen(reportExpense)}
                note={report.expenseHint}
              />
              <Metric
                label={
                  reportSales - reportExpense < 0 ? report.loss : report.profit
                }
                value={yen(reportSales - reportExpense)}
                note={report.profitHint}
              />
              <Metric
                label={report.harvest}
                value={`${reportHarvest.toFixed(1)} kg`}
                note={
                  reportHarvest
                    ? `${report.costPerKg} ${yen(reportExpense / reportHarvest)}`
                    : report.costHint
                }
              />
            </div>
            <section className="report-block">
              <SectionTitle title={report.plTitle} detail={report.plDetail} />
              <div className="pl-sheet">
                <p className="pl-row income">
                  <span>{report.salesIncome}</span>
                  <b>{yen(reportSales)}</b>
                </p>
                <p className="pl-row">
                  <span>− {report.materialExpense}</span>
                  <b>{yen(reportMaterial)}</b>
                </p>
                <p className="pl-row">
                  <span>− {report.laborWages}</span>
                  <b>{yen(reportWages)}</b>
                </p>
                <p className="pl-row">
                  <span>− {report.travelCost}</span>
                  <b>{yen(reportTravel)}</b>
                </p>
                <p className="pl-row subtotal">
                  <span>{report.totalExpense}</span>
                  <b>{yen(reportExpense)}</b>
                </p>
                <p
                  className={`pl-row result ${
                    reportSales - reportExpense > 0
                      ? "good"
                      : reportSales - reportExpense < 0
                        ? "bad"
                        : ""
                  }`}
                >
                  <span>
                    {reportSales - reportExpense > 0
                      ? report.netProfit
                      : reportSales - reportExpense < 0
                        ? report.netLoss
                        : report.breakEven}
                  </span>
                  <b>{yen(Math.abs(reportSales - reportExpense))}</b>
                </p>
                <p className="pl-note">
                  <span>{report.margin}</span>
                  <b>
                    {reportSales
                      ? `${(((reportSales - reportExpense) / reportSales) * 100).toFixed(0)}%`
                      : "—"}
                  </b>
                </p>
                <p className="pl-note">
                  <span>{report.pending}</span>
                  <b>{yen(reportPending)}</b>
                </p>
                <p className="pl-note">
                  <span>{report.invested}</span>
                  <b>{yen(reportInvested)}</b>
                </p>
              </div>
            </section>
            <section className="report-block">
              <SectionTitle
                title={report.spentTitle}
                detail={report.spentDetail}
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>{report.person}</th>
                      <th>{report.spent}</th>
                      <th>{report.share}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportSpenders.length ? (
                      <>
                        {reportSpenders.map(([name, amount]) => (
                          <tr key={name}>
                            <td>{name}</td>
                            <td>{yen(amount)}</td>
                            <td>
                              <span className="share-cell">
                                <i
                                  style={{
                                    width: `${reportSpendTotal ? (amount / reportSpendTotal) * 100 : 0}%`,
                                  }}
                                />
                                <em>
                                  {reportSpendTotal
                                    ? `${((amount / reportSpendTotal) * 100).toFixed(0)}%`
                                    : "—"}
                                </em>
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="table-total">
                          <td>{report.totalExpense}</td>
                          <td>{yen(reportSpendTotal)}</td>
                          <td>100%</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={3}>{report.noData}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="report-block">
              <SectionTitle
                title={report.membersTitle}
                detail={report.membersDetail}
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>{report.member}</th>
                      <th>{report.hours}</th>
                      <th>{report.wages}</th>
                      <th>{report.travel}</th>
                      <th>{common.paidBy}</th>
                      <th>{report.investment}</th>
                      <th>{report.contribution}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportMembers.length ? (
                      <>
                        {reportMembers.map((member) => (
                          <tr key={member.name}>
                            <td>{member.name}</td>
                            <td>
                              {member.hours
                                ? `${member.hours.toFixed(1)} h`
                                : "—"}
                            </td>
                            <td>{member.wages ? yen(member.wages) : "—"}</td>
                            <td>{member.travel ? yen(member.travel) : "—"}</td>
                            <td>{member.paid ? yen(member.paid) : "—"}</td>
                            <td>
                              {member.investment ? yen(member.investment) : "—"}
                            </td>
                            <td>
                              <b>{yen(member.contribution)}</b>
                            </td>
                          </tr>
                        ))}
                        <tr className="table-total">
                          <td>{report.contribution}</td>
                          <td>{reportHours.toFixed(1)} h</td>
                          <td>{yen(reportWages)}</td>
                          <td>{yen(reportTravel)}</td>
                          <td>{yen(reportSpendTotal)}</td>
                          <td>{yen(reportInvested)}</td>
                          <td>{yen(reportSpendTotal + reportInvested)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={7}>{report.noData}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="report-hint">{report.contributionHint}</p>
            </section>
            <section className="report-block">
              <SectionTitle
                title={report.cropTitle}
                detail={report.cropDetail}
              />
              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>{common.crop}</th>
                      <th>{labels[language].harvest}</th>
                      <th>{labels[language].sales}</th>
                      <th>{report.directExpense}</th>
                      <th>{report.costPerKg}</th>
                      <th>{report.result}</th>
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
                            (total, entry) =>
                              total + Number(entry.quantity ?? 0),
                            0,
                          );
                        const cropSales = sumOf(
                          rows.filter((entry) => entry.kind === "sale"),
                        );
                        const expense = sumOf(
                          rows.filter(
                            (entry) =>
                              entry.kind === "expense" ||
                              entry.kind === "labor",
                          ),
                        );
                        return (
                          <tr key={crop}>
                            <td>{crop}</td>
                            <td>{harvest ? `${harvest} kg` : "—"}</td>
                            <td>{yen(cropSales)}</td>
                            <td>{yen(expense)}</td>
                            <td>{harvest ? yen(expense / harvest) : "—"}</td>
                            <td
                              className={
                                cropSales - expense < 0 ? "bad" : "good"
                              }
                            >
                              {yen(cropSales - expense)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6}>{report.noData}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            {fullReport && (
              <section className="report-block">
                <SectionTitle
                  title={report.monthsTitle}
                  detail={report.monthsDetail}
                />
                <div className="finance-table-wrap">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>{report.month}</th>
                        <th>{report.harvest}</th>
                        <th>{labels[language].sales}</th>
                        <th>{report.expense}</th>
                        <th>{report.result}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportMonths.length ? (
                        <>
                          {reportMonths.map((row) => (
                            <tr key={row.month}>
                              <td>
                                <button
                                  type="button"
                                  className="month-link"
                                  onClick={() => {
                                    setReportMonth(row.month);
                                    setReportScope("month");
                                  }}
                                >
                                  {monthName(row.month, language)}
                                </button>
                              </td>
                              <td>{row.harvest ? `${row.harvest} kg` : "—"}</td>
                              <td>{yen(row.sales)}</td>
                              <td>{yen(row.expense)}</td>
                              <td className={row.profit < 0 ? "bad" : "good"}>
                                {yen(row.profit)}
                              </td>
                            </tr>
                          ))}
                          <tr className="table-total">
                            <td>{report.allTime}</td>
                            <td>{reportHarvest.toFixed(1)} kg</td>
                            <td>{yen(reportSales)}</td>
                            <td>{yen(reportExpense)}</td>
                            <td>{yen(reportSales - reportExpense)}</td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan={5}>{report.noData}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
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
                      <option value="viewer">Viewer — view only</option>
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
              <p className="small-pro">
                A <b>Viewer</b> sees every page, report and CSV export of this
                farm but cannot add, edit or delete anything. Pick that role for
                someone who only needs to follow the numbers.
              </p>
            </article>
            <article className="finance-card settings-page">
              <SectionTitle
                title={
                  language === "ja"
                    ? "パスワードの変更"
                    : language === "bn"
                      ? "পাসওয়ার্ড পরিবর্তন"
                      : "Change password"
                }
                detail={email ?? ""}
              />
              <form
                className="finance-form member-form"
                onSubmit={changePassword}
              >
                <label className="full">
                  Current password
                  <input name="current" type="password" required />
                </label>
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    required
                  />
                </label>
                <label>
                  Repeat new password
                  <input
                    name="confirm"
                    type="password"
                    minLength={8}
                    required
                  />
                </label>
                <button className="finance-button" disabled={busy}>
                  Save new password
                </button>
              </form>
              <p className="small-pro">
                Forgot the current password? Sign out and use{" "}
                <b>Forgot password</b> on the sign-in screen: it asks for your
                email and the new password, and no email has to arrive.
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
                {!readOnly && (
                  <button
                    className="finance-button secondary"
                    disabled={busy}
                    onClick={() => void import2026Workbook()}
                  >
                    Import 2026 Expense & Sales workbook
                  </button>
                )}
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
// A name field that is picked from the farm's own names instead of typed, with
// a way out for a name nobody has used yet.
const newNameOption = "__new_name__";
function HolderSelect({
  name,
  label,
  options,
  words,
  defaultValue = "",
  required = false,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  options: string[];
  words: (typeof commonText)[Language];
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  // A saved record can name someone who has since been removed from the list.
  const listed =
    defaultValue && !options.includes(defaultValue)
      ? [defaultValue, ...options]
      : options;
  // Null while picking from the list; a string once the member is typing one
  // in, so choosing "new name" starts from an empty field.
  const [typed, setTyped] = useState<string | null>(
    listed.length ? null : defaultValue,
  );
  return (
    <label className={className}>
      {label}
      {typed !== null ? (
        <input
          name={name}
          required={required}
          defaultValue={typed}
          placeholder={placeholder}
        />
      ) : (
        <select
          name={name}
          required={required}
          defaultValue={defaultValue}
          onChange={(event) => {
            if (event.target.value === newNameOption) setTyped("");
          }}
        >
          <option value="">{required ? words.selectHolder : "—"}</option>
          {listed.map((holder) => (
            <option key={holder} value={holder}>
              {holder}
            </option>
          ))}
          <option value={newNameOption}>{words.newName}</option>
        </select>
      )}
      {typed !== null && listed.length > 0 && (
        <button
          type="button"
          className="link-button"
          onClick={() => setTyped(null)}
        >
          {words.chooseFromList}
        </button>
      )}
    </label>
  );
}
// The farm plants something new every season, so the crop list is not fixed:
// the dropdown holds every crop already on record and "＋ New crop" types in one
// nobody has grown yet. Saving that record puts the crop in the list for good.
const newCropOption = "__new_crop__";
function CropSelect({
  label,
  options,
  words,
  name,
  value,
  onChange,
  defaultValue = "",
  required = false,
  emptyLabel,
  className,
}: {
  label: string;
  options: string[];
  words: (typeof commonText)[Language];
  // Sale lines keep their crop in React state; every other form reads it off
  // the submitted form, so both bindings are supported.
  name?: string;
  value?: string;
  onChange?: (crop: string) => void;
  defaultValue?: string;
  required?: boolean;
  // The text of the blank first option, for the forms where "no crop" is a
  // valid answer. Omitted means a crop must be picked.
  emptyLabel?: string;
  className?: string;
}) {
  const held = value ?? defaultValue;
  // A saved record can name a crop that has since dropped off the list.
  const listed = held && !options.includes(held) ? [held, ...options] : options;
  const [typing, setTyping] = useState(false);
  const pick = (next: string) => {
    if (next === newCropOption) {
      setTyping(true);
      onChange?.("");
      return;
    }
    onChange?.(next);
  };
  return (
    <label className={className}>
      {label}
      {typing ? (
        <input
          name={name}
          required={required}
          placeholder={words.newCropName}
          autoFocus
          {...(onChange
            ? { value: value ?? "", onChange: (e) => onChange(e.target.value) }
            : { defaultValue: "" })}
        />
      ) : (
        <select
          name={name}
          required={required}
          onChange={(event) => pick(event.target.value)}
          {...(onChange ? { value: value ?? "" } : { defaultValue })}
        >
          {emptyLabel === undefined ? (
            <option value="" disabled>
              {words.selectCrop}
            </option>
          ) : (
            <option value="">{emptyLabel}</option>
          )}
          {listed.map((crop) => (
            <option key={crop} value={crop}>
              {crop}
            </option>
          ))}
          <option value={newCropOption}>{words.newCrop}</option>
        </select>
      )}
      {typing && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setTyping(false);
            onChange?.("");
          }}
        >
          {words.chooseFromList}
        </button>
      )}
    </label>
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
  // Left out for a view-only member, which also drops the actions column.
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (entry: Entry) => void;
  editingId?: string;
}) {
  const actions = Boolean(onDelete || onEdit);
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
            {actions && <th></th>}
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
                {actions && (
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
                      {onDelete && (
                        <button
                          className="table-delete"
                          disabled={busy}
                          onClick={() => void onDelete(entry.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={actions ? 7 : 6}>No records yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
