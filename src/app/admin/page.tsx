"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  Copy,
  Eye,
  EyeOff,
  LayoutDashboard,
  Package,
  Settings as Cog,
  ShieldCheck,
  ShoppingCart,
  Star,
  Users,
  Bell,
  Mail,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  ADMIN_EMAILS,
  normalizeProduct,
  variantsOf,
  CATEGORIES,
  DEFAULT_SETTINGS,
  STATUSES,
  fmt,
  uploadImage,
  useApp,
  waLink,
  type Product,
  type Settings,
} from "@/lib/app";
import { LogoLoader } from "@/components/Brand";
import { DOT, VariantEditor, blankVariant } from "@/components/VariantEditor";
import type { Order } from "@/lib/app";

const LOW = 10;
const NAV = [
  ["Overview", LayoutDashboard],
  ["Products", Package],
  ["Orders", ShoppingCart],
  ["Messages", Mail],
  ["Customers", Users],
  ["Team", ShieldCheck],
  ["Settings", Cog],
] as const;
type Tab = (typeof NAV)[number][0];
type Draft = Omit<Product, "id"> & { id?: string };
type Msg = { id: string; name: string; email: string; phone: string; message: string; createdAt: number; read?: boolean; status?: string };
type Customer = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

const blank: Draft = {
  name: "",
  description: "",
  category: "",
  gender: "unisex",
  sizes: [],
  colors: [],
  images: [],
  stock: 0,
  minQty: 2,
  priceNgn: 0,
  priceUsd: 0,
  featured: false,
  hidden: false,
  variants: [blankVariant()],
};

const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL", "26", "28", "30", "32", "34", "36", "38", "40"];
function Picker({ label, options, value, onChange, hint, dots }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; hint: string; dots?: boolean }) {
  const [t, setT] = useState("");
  const val = value || [];
  const all = [...options, ...val.filter((v) => !options.some((o) => o.toLowerCase() === v.toLowerCase()))];
  const toggle = (o: string) => onChange(val.includes(o) ? val.filter((x) => x !== o) : [...val, o]);
  const add = () => { const v = t.trim(); if (v && !val.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...val, v]); setT(""); };
  return (
    <div className="grid gap-2">
      <p className="text-xs font-bold uppercase">{label} <span className="font-normal normal-case text-muted-foreground">· {hint}</span></p>
      <div className="flex flex-wrap gap-2">
        {all.map((o) => (
          <button type="button" key={o} onClick={() => toggle(o)} className={`chip flex items-center gap-1.5 ${val.includes(o) ? "on" : ""}`}>
            {dots && DOT[o.toLowerCase()] && <span className="h-3 w-3 rounded-full border border-neutral-400" style={{ background: DOT[o.toLowerCase()] }} />}{o}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="field" placeholder={`Add another ${label.toLowerCase().replace(/s$/, "")}…`} value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn btn-ghost !px-4" onClick={add}>Add</button>
      </div>
    </div>
  );
}

const list = (v: string) =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const Badge = ({
  c,
  children,
}: {
  c: string;
  children: React.ReactNode;
}) => (
  <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${c}`}>
    {children}
  </span>
);

export default function Admin() {
  const { user, isAdmin, isOwner, authLoading, allProducts: products, settings } =
    useApp();
  const [tab, setTab] = useState<Tab>("Overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [s, setS] = useState<Settings>(settings);
  const [saveMsg, setSaveMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
    const [orderStatus, setOrderStatus] = useState<string>("All");
  const [orderSearch, setOrderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const knownOrdersRef = useRef<Set<string> | null>(null);

  useEffect(() => setS(settings), [settings]);

  useEffect(() => {
    if (!isAdmin) return;
    const a = onSnapshot(collection(db, "orders"), (x) =>
      setOrders(
        x.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Order)
          .sort((p, r) => r.createdAt - p.createdAt)
      )
    );
    const b = onSnapshot(collection(db, "users"), (x) =>
      setCustomers(x.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer))
    );
    const m = onSnapshot(collection(db, "messages"), (x) =>
      setMessages(
        x.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Msg)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      )
    );
    const c = isOwner
      ? onSnapshot(collection(db, "admins"), (x) =>
          setAdmins(x.docs.map((d) => d.id))
        )
      : () => {};
    return () => {
      a();
      b();
      m();
      c();
    };
  }, [isAdmin, isOwner]);

  // Load seen order ids + request notification permission
  useEffect(() => {
    if (!isAdmin || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("unik_seen_orders");
      if (raw) setSeenOrderIds(new Set(JSON.parse(raw)));
    } catch {}
    setNotifPermission(Notification?.permission || "default");
  }, [isAdmin]);

  // Detect new orders → toast + browser notification
  useEffect(() => {
    if (!isAdmin || orders.length === 0) return;
    if (knownOrdersRef.current === null) {
      knownOrdersRef.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = orders.filter((o) => !knownOrdersRef.current!.has(o.id));
    if (fresh.length === 0) return;
    for (const o of fresh) knownOrdersRef.current.add(o.id);
    const newest = fresh[0]!;
    const label =
      newest.orderType === "booking"
        ? `New booking from ${newest.customerName}`
        : `New order from ${newest.customerName}`;
    const detail = `${fmt(newest.totalNgn, "NGN")} · ${newest.status}`;
    setToast(`${label} — ${detail}`);
    setTimeout(() => setToast(null), 8000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        const n = new Notification("UNIK TRENDS", {
          body: `${label}\n${detail}`,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-96.png",
          tag: newest.id,
          data: { url: "/admin" },
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {}
    }
  }, [orders, isAdmin]);

  const unreadCount = useMemo(
    () => orders.filter((o) => !seenOrderIds.has(o.id)).length,
    [orders, seenOrderIds]
  );
  const unreadMessages = useMemo(
    () => messages.filter((m) => !m.read).length,
    [messages]
  );

  const markOrdersSeen = () => {
    const ids = new Set(orders.map((o) => o.id));
    setSeenOrderIds(ids);
    try {
      localStorage.setItem("unik_seen_orders", JSON.stringify([...ids]));
    } catch {}
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") {
      alert("Notifications are not supported on this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      new Notification("UNIK TRENDS", {
        body: "You will get alerts when customers book or order.",
        icon: "/icons/icon-192.png",
      });
    }
  };

  const shown = useMemo(
    () =>
      products.filter(
        (p) => !q || p.name.toLowerCase().includes(q.toLowerCase())
      ),
    [products, q]
  );
  const lowStock = products.filter((p) => p.stock <= LOW);

  const customerRows = useMemo(() => {
    const map = new Map<
      string,
      Customer & {
        orderCount: number;
        totalNgn: number;
        lastOrderAt: number;
        orders: Order[];
      }
    >();

    for (const c of customers) {
      map.set(c.id, {
        ...c,
        orderCount: 0,
        totalNgn: 0,
        lastOrderAt: 0,
        orders: [],
      });
    }

    for (const o of orders) {
      const existing = map.get(o.userId);
      if (existing) {
        existing.orderCount += 1;
        existing.totalNgn += o.totalNgn || 0;
        existing.lastOrderAt = Math.max(existing.lastOrderAt, o.createdAt);
        existing.orders.push(o);
        if (!existing.name && o.customerName) existing.name = o.customerName;
        if (!existing.phone && o.phone) existing.phone = o.phone;
      } else {
        map.set(o.userId, {
          id: o.userId,
          name: o.customerName,
          phone: o.phone,
          email: undefined,
          orderCount: 1,
          totalNgn: o.totalNgn || 0,
          lastOrderAt: o.createdAt,
          orders: [o],
        });
      }
    }

    let rows = Array.from(map.values()).sort(
      (a, b) => b.lastOrderAt - a.lastOrderAt || b.orderCount - a.orderCount
    );

    if (customerSearch.trim()) {
      const s = customerSearch.toLowerCase();
      rows = rows.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(s) ||
          (c.email || "").toLowerCase().includes(s) ||
          (c.phone || "").toLowerCase().includes(s)
      );
    }
    return rows;
  }, [customers, orders, customerSearch]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderStatus !== "All") {
      list = list.filter((o) => o.status === orderStatus);
    }
    if (selectedCustomerId) {
      list = list.filter((o) => o.userId === selectedCustomerId);
    }
    if (orderSearch.trim()) {
      const s = orderSearch.toLowerCase();
      list = list.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(s) ||
          o.phone?.toLowerCase().includes(s) ||
          o.id.toLowerCase().includes(s) ||
          o.items?.some((i) => i.name.toLowerCase().includes(s))
      );
    }
    return list;
  }, [orders, orderStatus, orderSearch, selectedCustomerId]);

  if (authLoading) {
    return <LogoLoader />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-5xl">Admins only</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {!user
            ? "Log in with the owner email and password (Auth page → Admin login)."
            : `Signed in as ${user.email}. This account is not an admin. Set NEXT_PUBLIC_ADMIN_EMAIL to this email, or ask the owner to add you under Team.`}
        </p>
        {!user ? (
          <Link href="/auth?next=/admin" className="btn mt-6">
            Admin log in
          </Link>
        ) : (
          <Link href="/auth" className="btn mt-6 btn-ghost">
            Switch account
          </Link>
        )}
      </div>
    );
  }

  const bulk = async (
    fn: (id: string, b: ReturnType<typeof writeBatch>) => void
  ) => {
    const b = writeBatch(db);
    sel.forEach((id) => fn(id, b));
    await b.commit();
    setSel([]);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const variants = (draft.variants ?? []).map((v) => ({ ...v, color: v.color.trim() })).filter((v) => v.color);
      if (!draft.category.trim()) throw new Error("Enter the product type (e.g. Hoodies, Baggy Jeans).");
      if (!variants.length) throw new Error("Add at least one colour.");
      if (variants.some((v) => !v.images.length)) throw new Error("Every colour needs at least one photo.");
      const clean = variants.map((v) => ({ color: v.color, images: v.images, stock: Number(v.stock) || 0, ...(v.priceNgn ? { priceNgn: v.priceNgn } : {}), ...(v.priceUsd ? { priceUsd: v.priceUsd } : {}) }));
      const priceNgn = Number(draft.priceNgn) || 0;
      const priceUsd =
        Number(draft.priceUsd) ||
        Math.round((priceNgn / (settings.rate || 1)) * 100) / 100;
      const sizes = Array.isArray(draft.sizes) ? draft.sizes.map(String) : [];
      const { id, ...rest } = draft;
      const data = {
        name: String(draft.name || "").trim() || "Untitled",
        description: String(draft.description || ""),
        category: String(draft.category || "Other").trim(),
        gender: String(draft.gender || "unisex"),
        sizes,
        variants: clean,
        colors: clean.map((v) => v.color),
        images: clean[0]!.images,
        stock: clean.reduce((n, v) => n + v.stock, 0),
        minQty: Number(draft.minQty) || 1,
        priceNgn,
        priceUsd,
        featured: !!draft.featured,
        hidden: !!draft.hidden,
      };
      if (!data.name || data.name === "Untitled") throw new Error("Enter a product name.");
      if (priceNgn <= 0) throw new Error("Enter a price in NGN.");
      if (!sizes.length) throw new Error("Pick at least one size.");
      if (id) await setDoc(doc(db, "products", id), data);
      else await addDoc(collection(db, "products"), data);
      setDraft(null);
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };

  const upload = async (files: FileList | null) => {
    if (!files || !draft) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      setDraft({ ...draft, images: [...draft.images, ...urls] });
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };

  const toggleFeatured = async (p: Product) => {
    await updateDoc(doc(db, "products", p.id), { featured: !p.featured });
  };

  const num = (
    k: "stock" | "minQty" | "priceNgn" | "priceUsd",
    label: string
  ) => (
    <label className="grid gap-1 text-xs font-bold uppercase">
      {label}
      <input
        className="field"
        type="number"
        step="any"
        value={draft![k]}
        onChange={(e) =>
          setDraft({ ...draft!, [k]: Number(e.target.value) })
        }
      />
    </label>
  );

  const selectedCustomer = selectedCustomerId
    ? customerRows.find((c) => c.id === selectedCustomerId)
    : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 z-[60] mx-auto max-w-md border-2 border-primary bg-background p-4 shadow-block md:left-auto md:right-6">
          <p className="text-sm font-bold">{toast}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="chip" onClick={() => { setToast(null); setTab("Orders"); markOrdersSeen(); }}>View orders</button>
            <button type="button" className="chip" onClick={() => setToast(null)}>Dismiss</button>
          </div>
        </div>
      )}
      <aside className="shrink-0 bg-primary text-primary-foreground md:min-h-[calc(100vh-7rem)] md:w-56">
        <p className="hidden px-5 pt-6 font-display text-lg md:block">Admin</p>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-3">
          {NAV.filter(([t]) => t !== "Team" || isOwner).map(([t, Icon]) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (t !== "Orders" && t !== "Customers") setSelectedCustomerId(null);
                if (t === "Orders") markOrdersSeen();
              }}
              className={`flex shrink-0 items-center gap-3 px-3 py-2.5 text-sm font-bold ${
                tab === t
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t}
              {t === "Orders" && unreadCount > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
                  {unreadCount}
                </span>
              )}
              {t === "Messages" && unreadMessages > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
                  {unreadMessages}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 flex-1 p-4 md:p-8">
        <h1 className="text-4xl md:text-5xl">{tab}</h1>

        {tab === "Overview" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3 border-2 border-primary p-4">
              <Bell className="h-5 w-5" />
              <div className="flex-1 text-sm">
                <p className="font-bold">Order alerts</p>
                <p className="text-muted-foreground">
                  {notifPermission === "granted"
                    ? "Browser notifications are on. New bookings & orders will pop up on this device."
                    : "Enable notifications so new bookings and orders alert you on mobile and desktop."}
                </p>
              </div>
              {notifPermission !== "granted" && (
                <button type="button" className="btn btn-accent !py-2" onClick={enableNotifications}>
                  Enable notifications
                </button>
              )}
              {unreadCount > 0 && (
                <button type="button" className="chip" onClick={() => { markOrdersSeen(); setTab("Orders"); }}>
                  {unreadCount} new → Orders
                </button>
              )}
            </div>
            {[
              ["Total orders", orders.length],
              ["Pending", orders.filter((o) => o.status === "Pending").length],
              ["Customers", customerRows.length],
              ["Low / out of stock", lowStock.length],
            ].map(([l, n]) => (
              <div
                key={l as string}
                className="border-2 border-primary p-5 shadow-block"
              >
                <p className="font-display text-4xl">{n}</p>
                <p className="text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
            <div className="sm:col-span-2">
              <h2 className="mb-2 text-xl">Stock alerts</h2>
              {lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All products are well stocked.
                </p>
              ) : (
                lowStock.map((p) => (
                  <p
                    key={p.id}
                    className="flex justify-between border-b py-2 text-sm"
                  >
                    <span>{p.name}</span>
                    <b
                      className={
                        p.stock <= 0 ? "text-destructive" : "text-accent"
                      }
                    >
                      {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                    </b>
                  </p>
                ))
              )}
            </div>
            <div className="sm:col-span-2">
              <h2 className="mb-2 text-xl">Recent orders</h2>
              {orders.slice(0, 5).map((o) => (
                <p key={o.id} className="border-b py-2 text-sm">
                  {o.customerName} ·{" "}
                  {fmt(
                    o.currency === "NGN" ? o.totalNgn : o.totalUsd,
                    o.currency
                  )}{" "}
                  · {o.status}
                </p>
              ))}
              {orders.length === 0 && (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              )}
            </div>
          </div>
        )}

        {tab === "Products" && (
          <div className="mt-6">
            {draft ? (
              <div className="grid max-w-2xl gap-3">
                <input
                  className="field"
                  placeholder="Name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({ ...draft, name: e.target.value })
                  }
                />
                <textarea
                  className="field"
                  rows={3}
                  placeholder="Description"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      className="field"
                      list="product-types"
                      placeholder="Product type (e.g. Baggy Jeans, Hoodie)"
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    />
                    <datalist id="product-types">
                      {Array.from(new Set([...CATEGORIES.filter((c) => c !== "Other"), ...products.map((p) => p.category)])).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <select
                    className="field"
                    value={draft.gender}
                    onChange={(e) =>
                      setDraft({ ...draft, gender: e.target.value })
                    }
                  >
                    {["men", "women", "unisex"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <Picker label="Sizes" options={SIZES} value={draft.sizes} onChange={(sizes) => setDraft({ ...draft, sizes })} hint="Pick sizes or type your own (e.g. 38, Free size)" />
                <VariantEditor value={draft.variants ?? []} onChange={(variants) => setDraft({ ...draft, variants })} />
                <div className="grid grid-cols-2 gap-3">
                  {num("priceNgn", "Price ₦")}
                  {num("priceUsd", "Price $ (0 = auto from rate)")}
                  {num("minQty", "Minimum order qty")}
                </div>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(e) =>
                      setDraft({ ...draft, featured: e.target.checked })
                    }
                  />
                  Show as trending (homepage featured)
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={!!draft.hidden}
                    onChange={(e) =>
                      setDraft({ ...draft, hidden: e.target.checked })
                    }
                  />
                  Hide from the shop
                </label>
                <div className="flex gap-2">
                  <button
                    className="btn"
                    disabled={busy || !draft.name}
                    onClick={save}
                  >
                    {busy ? "Working…" : "Save product"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setDraft(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="btn"
                    onClick={() => setDraft({ ...blank })}
                  >
                    Add product
                  </button>
                  <input
                    className="field max-w-xs"
                    placeholder="Search products…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  {sel.length > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {sel.length} selected
                      </span>
                      <button
                        className="chip"
                        onClick={() =>
                          bulk((id, b) =>
                            b.update(doc(db, "products", id), {
                              featured: true,
                            })
                          )
                        }
                      >
                        Mark trending
                      </button>
                      <button
                        className="chip"
                        onClick={() =>
                          bulk((id, b) =>
                            b.update(doc(db, "products", id), {
                              featured: false,
                            })
                          )
                        }
                      >
                        Unmark trending
                      </button>
                      <button
                        className="chip"
                        onClick={() =>
                          bulk((id, b) =>
                            b.update(doc(db, "products", id), {
                              hidden: true,
                            })
                          )
                        }
                      >
                        Hide
                      </button>
                      <button
                        className="chip"
                        onClick={() =>
                          bulk((id, b) =>
                            b.update(doc(db, "products", id), {
                              hidden: false,
                            })
                          )
                        }
                      >
                        Show
                      </button>
                      <button
                        className="chip"
                        onClick={() =>
                          confirm(`Delete ${sel.length} products?`) &&
                          bulk((id, b) => b.delete(doc(db, "products", id)))
                        }
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                <ul className="mt-4 divide-y">
                  {shown.length === 0 && (
                    <li className="py-6 text-sm text-muted-foreground">
                      No products yet. Click “Add product” to create your first
                      one.
                    </li>
                  )}
                  {shown.map((p) => (
                    <li
                      key={p.id}
                      className={`flex flex-wrap items-center gap-3 py-3 ${
                        p.hidden ? "opacity-60" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sel.includes(p.id)}
                        onChange={() =>
                          setSel(
                            sel.includes(p.id)
                              ? sel.filter((x) => x !== p.id)
                              : [...sel, p.id]
                          )
                        }
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.images?.[0] || "/logo.png"}
                        alt=""
                        className="h-14 w-11 bg-muted object-cover"
                      />
                      <div className="min-w-40 flex-1">
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(p.priceNgn, "NGN")} / {fmt(p.priceUsd, "USD")} ·{" "}
                          {p.category}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.hidden && <Badge c="bg-muted">Hidden</Badge>}
                          {p.featured && (
                            <Badge c="bg-accent text-accent-foreground">
                              Trending
                            </Badge>
                          )}
                          {p.stock <= 0 ? (
                            <Badge c="bg-destructive text-destructive-foreground">
                              Out of stock
                            </Badge>
                          ) : (
                            p.stock <= LOW && (
                              <Badge c="bg-accent text-accent-foreground">
                                Low stock
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                      <label className="text-xs font-bold uppercase">
                        Stock{" "}
                        <input
                          className="field !w-20 !py-1"
                          type="number"
                          defaultValue={p.stock}
                          key={p.stock}
                          onBlur={(e) =>
                            Number(e.target.value) !== p.stock &&
                            updateDoc(doc(db, "products", p.id), {
                              stock: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <button
                        className="chip"
                        title={
                          p.featured
                            ? "Remove from trending"
                            : "Mark as trending"
                        }
                        onClick={() => toggleFeatured(p)}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            p.featured ? "fill-current text-accent" : ""
                          }`}
                        />
                      </button>
                      <button
                        className="chip"
                        title={p.hidden ? "Show in shop" : "Hide from shop"}
                        onClick={() =>
                          updateDoc(doc(db, "products", p.id), {
                            hidden: !p.hidden,
                          })
                        }
                      >
                        {p.hidden ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        className="chip"
                        title="Duplicate"
                        onClick={() => {
                          const { id: _id, ...rest } = p;
                          addDoc(collection(db, "products"), {
                            ...rest,
                            name: `${p.name} (copy)`,
                            hidden: true,
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className="chip" onClick={() => {
                          const n = normalizeProduct(p.id, p as unknown as Record<string, unknown>);
                          setDraft({ ...n, id: n.id, variants: variantsOf(n).map((v) => ({ ...v })) });
                        }}>
                        Edit
                      </button>
                      <button
                        className="chip"
                        onClick={() =>
                          confirm("Delete this product?") &&
                          deleteDoc(doc(db, "products", p.id))
                        }
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {tab === "Orders" && (
          <div className="mt-6">
            {selectedCustomer && (
              <div className="mb-4 flex flex-wrap items-center gap-2 border-2 border-primary bg-muted/40 p-3 text-sm">
                <span>
                  Showing orders for{" "}
                  <b>{selectedCustomer.name || "Customer"}</b>
                  {selectedCustomer.phone
                    ? ` · ${selectedCustomer.phone}`
                    : ""}
                </span>
                <button
                  className="chip"
                  onClick={() => setSelectedCustomerId(null)}
                >
                  Clear filter
                </button>
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                className="field max-w-xs"
                placeholder="Search name, phone, product, order #…"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-1">
                {["All", ...STATUSES].map((st) => (
                  <button
                    key={st}
                    className={`chip ${
                      orderStatus === st
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }`}
                    onClick={() => setOrderStatus(st)}
                  >
                    {st}
                    {st !== "All" && (
                      <span className="ml-1 opacity-70">
                        (
                        {
                          orders.filter(
                            (o) =>
                              o.status === st &&
                              (!selectedCustomerId ||
                                o.userId === selectedCustomerId)
                          ).length
                        }
                        )
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <ul className="grid gap-3">
              {filteredOrders.length === 0 && (
                <p className="text-muted-foreground">No orders match.</p>
              )}
              {filteredOrders.map((o) => (
                <li
                  key={o.id}
                  className="border-2 border-primary p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b>
                      {o.customerName} · {o.phone}
                    </b>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()} · #
                      {o.id.slice(0, 6)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge c={o.orderType === "booking" ? "bg-secondary" : "bg-primary text-primary-foreground"}>
                      {o.orderType === "booking" ? "Booking / pick-up" : "Online order"}
                    </Badge>
                    <Badge c={o.paymentStatus === "paid" ? "bg-whatsapp text-whatsapp-foreground" : "bg-muted"}>
                      {o.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                    {!!o.waybillFeeNgn && (
                      <Badge c="bg-accent text-accent-foreground">
                        Waybill {fmt(o.waybillFeeNgn, "NGN")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2">
                    {o.items
                      .map(
                        (i) =>
                          `${i.qty}× ${i.name} (${[i.size, i.color]
                            .filter(Boolean)
                            .join(", ")})`
                      )
                      .join("; ")}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {o.delivery}
                    {o.address ? ` · ${o.address}` : ""}
                    {o.notes ? ` · Note: ${o.notes}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <b>
                      {fmt(o.totalNgn, "NGN")} / {fmt(o.totalUsd, "USD")}
                    </b>
                    <select
                      className="field w-auto"
                      value={o.status}
                      onChange={(e) =>
                        updateDoc(doc(db, "orders", o.id), {
                          status: e.target.value,
                        })
                      }
                    >
                      {STATUSES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    <input
                      className="field max-w-xs"
                      placeholder="Note to customer (optional)"
                      defaultValue={(o as { statusNote?: string }).statusNote || ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== ((o as { statusNote?: string }).statusNote || ""))
                          updateDoc(doc(db, "orders", o.id), { statusNote: v });
                      }}
                    />
                    <a
                      className="btn btn-wa !py-2"
                      target="_blank"
                      rel="noreferrer"
                      href={waLink(
                        o.phone,
                        `Hi ${o.customerName}, this is UNIK TRENDS about your order #${o.id.slice(0, 6)}.`
                      )}
                    >
                      WhatsApp
                    </a>
                    <button
                      className="chip"
                      onClick={() => {
                        setSelectedCustomerId(o.userId);
                        setTab("Customers");
                      }}
                    >
                      View customer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "Messages" && (
          <div className="mt-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Messages from the contact form. Mark as read when you have replied.
            </p>
            {messages.length === 0 ? (
              <p className="text-muted-foreground">No messages yet.</p>
            ) : (
              <ul className="grid gap-3">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`border-2 border-primary p-4 text-sm ${m.read ? "opacity-60" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{m.name}</p>
                        <p className="text-muted-foreground">
                          {m.email} · {m.phone}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap">{m.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!m.read && (
                        <button
                          type="button"
                          className="chip"
                          onClick={() =>
                            updateDoc(doc(db, "messages", m.id), { read: true, status: "read" })
                          }
                        >
                          Mark read
                        </button>
                      )}
                      <a
                        className="btn btn-wa !py-1.5 text-xs"
                        href={`https://wa.me/${String(m.phone).replace(/\D/g, "")}?text=${encodeURIComponent("Hi " + m.name + ", this is UNIK TRENDS regarding your message.")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                      <a className="chip" href={`mailto:${m.email}`}>
                        Email
                      </a>
                      <button
                        type="button"
                        className="chip"
                        onClick={() =>
                          confirm("Delete this message?") &&
                          deleteDoc(doc(db, "messages", m.id))
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "Customers" && (
          <div className="mt-6">
            <input
              className="field mb-4 max-w-xs"
              placeholder="Search customers…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            {customerRows.length === 0 ? (
              <p className="text-muted-foreground">
                No customers yet. They appear when someone signs up or places
                an order.
              </p>
            ) : (
              <ul className="divide-y">
                {customerRows.map((c) => {
                  const open = selectedCustomerId === c.id;
                  return (
                    <li key={c.id} className="py-4">
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
                        onClick={() =>
                          setSelectedCustomerId(open ? null : c.id)
                        }
                      >
                        <div>
                          <p className="font-bold">{c.name || "No name"}</p>
                          <p className="text-sm text-muted-foreground">
                            {[c.email, c.phone].filter(Boolean).join(" · ") ||
                              "No contact saved"}
                          </p>
                          {c.address && (
                            <p className="text-xs text-muted-foreground">
                              {c.address}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p>
                            <b>{c.orderCount}</b> order
                            {c.orderCount === 1 ? "" : "s"}
                          </p>
                          {c.orderCount > 0 && (
                            <p className="text-muted-foreground">
                              {fmt(c.totalNgn, "NGN")} total
                            </p>
                          )}
                          {c.lastOrderAt > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Last:{" "}
                              {new Date(c.lastOrderAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </button>
                      {open && (
                        <div className="mt-3 border-2 border-primary bg-muted/30 p-3">
                          <div className="mb-2 flex flex-wrap gap-2">
                            {c.phone && (
                              <a
                                className="btn btn-wa !py-1.5 text-xs"
                                target="_blank"
                                rel="noreferrer"
                                href={waLink(
                                  c.phone,
                                  `Hi ${c.name || ""}, this is UNIK TRENDS.`
                                )}
                              >
                                WhatsApp
                              </a>
                            )}
                            <button
                              className="chip"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setTab("Orders");
                              }}
                            >
                              Open in Orders tab
                            </button>
                          </div>
                          {c.orders.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No orders yet.
                            </p>
                          ) : (
                            <ul className="grid gap-2">
                              {c.orders.map((o) => (
                                <li
                                  key={o.id}
                                  className="border-b border-border pb-2 text-sm last:border-0"
                                >
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <span>
                                      #{o.id.slice(0, 6)} · {o.status}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(o.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="mt-1">
                                    {o.items
                                      .map((i) => `${i.qty}× ${i.name}`)
                                      .join("; ")}
                                  </p>
                                  <p className="font-bold">
                                    {fmt(o.totalNgn, "NGN")}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "Team" && (
          <div className="mt-6 max-w-xl">
            <p className="text-sm text-muted-foreground">
              Admins can manage products, orders and settings. They must sign
              in with a verified email. Only the owner can add or remove
              admins.
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const em = newAdmin.trim().toLowerCase();
                if (!em) return;
                await setDoc(doc(db, "admins", em), { addedAt: Date.now() });
                setNewAdmin("");
              }}
            >
              <input
                className="field"
                type="email"
                placeholder="new.admin@email.com"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
              />
              <button className="btn">Add admin</button>
            </form>
            <ul className="mt-4 divide-y text-sm">
              <li className="flex justify-between py-3">
                <span>{ADMIN_EMAILS.join(", ")}</span>
                <Badge c="bg-primary text-primary-foreground">Owners</Badge>
              </li>
              {admins.map((a) => (
                <li
                  key={a}
                  className="flex items-center justify-between py-3"
                >
                  <span>{a}</span>
                  <button
                    className="chip"
                    onClick={() =>
                      confirm(`Remove ${a}?`) &&
                      deleteDoc(doc(db, "admins", a))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "Settings" && (
          <div className="mt-6 grid max-w-3xl gap-6">
            <p className="text-sm text-muted-foreground">Everything here updates the live website straight away for all visitors.</p>
            {[
              ["Contact", [
                ["WhatsApp number", "whatsapp", "text", "With country code, e.g. 2348138911483"],
                ["Contact email", "contactEmail", "text", "Shown on the Contact page"],
                ["Opening hours", "openingHours", "text", "e.g. Mon–Sat, 9am–6pm"],
                ["Shop address", "shopAddress", "text", "Shown on the site and checkout"],
              ]],
              ["Pricing & delivery", [
                ["Exchange rate (₦ per $1)", "rate", "number", "Used to auto-fill dollar prices"],
                ["Waybill fee (₦)", "waybillFeeNgn", "number", "Added at checkout for waybill delivery"],
              ]],
              ["Homepage", [
                ["Top announcement bar", "announcement", "text", "The dark strip at the very top"],
                ["Hero title", "bannerTitle", "text", ""],
              ]],
            ].map(([title, fields]) => (
              <div key={title as string} className="border-2 border-primary p-5 shadow-block">
                <h2 className="mb-4 text-xl">{title as string}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(fields as string[][]).map(([l, k, type, hint]) => (
                    <label key={k} className="grid gap-1 text-xs font-bold uppercase">
                      {l}
                      <input className="field" type={type} value={String((s as unknown as Record<string, string | number>)[k] ?? "")} onChange={(e) => setS({ ...s, [k]: type === "number" ? Number(e.target.value) : e.target.value })} />
                      {hint && <span className="text-[11px] font-normal normal-case text-muted-foreground">{hint}</span>}
                    </label>
                  ))}
                </div>
                {title === "Homepage" && (
                  <label className="mt-4 grid gap-1 text-xs font-bold uppercase">Hero subtitle
                    <textarea className="field" rows={2} value={s.bannerSubtitle} onChange={(e) => setS({ ...s, bannerSubtitle: e.target.value })} />
                  </label>
                )}
              </div>
            ))}
            <div className="border-2 border-primary p-5 shadow-block">
              <h2 className="mb-4 text-xl">Delivery information</h2>
              <textarea className="field" rows={5} value={s.deliveryInfo} onChange={(e) => setS({ ...s, deliveryInfo: e.target.value })} />
            </div>
            <div className="flex items-center gap-4">
              <button
                className="btn"
                onClick={async () => {
                  let wa = s.whatsapp.replace(/\D/g, "");
                  if (wa.startsWith("0")) wa = "234" + wa.slice(1);
                  if (wa.length < 11) return setSaveMsg("Enter a valid WhatsApp number with country code.");
                  if (!(s.rate > 0) || s.waybillFeeNgn < 0) return setSaveMsg("Exchange rate must be above 0 and the waybill fee cannot be negative.");
                  try { await setDoc(doc(db, "settings", "main"), { ...DEFAULT_SETTINGS, ...s, whatsapp: wa }); setSaveMsg("Saved. The website is updated."); }
                  catch { setSaveMsg("Could not save. Check your admin access and try again."); }
                }}
              >
                Save settings
              </button>
              {saveMsg && <p className="text-sm font-bold">{saveMsg}</p>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
