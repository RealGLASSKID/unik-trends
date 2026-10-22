"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const SHOP_ADDRESS = "Tejuosho Plaza, Tejuosho Market, Yaba, Lagos, Nigeria";
export const MAP_QUERY = "Tejuosho Market, Yaba, Lagos, Nigeria";

export type Currency = "NGN" | "USD";
export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  gender: string;
  sizes: string[];
  colors: string[];
  images: string[];
  stock: number;
  minQty: number;
  priceNgn: number;
  priceUsd: number;
  featured: boolean;
  hidden?: boolean;
};
export type Settings = {
  whatsapp: string;
  rate: number;
  deliveryInfo: string;
  bannerTitle: string;
  bannerSubtitle: string;
  /** Flat waybill fee in NGN charged when customer chooses waybill delivery */
  waybillFeeNgn: number;
  shopAddress: string;
  announcement: string;
  contactEmail: string;
  openingHours: string;
};
export type CartItem = {
  key: string;
  productId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  qty: number;
  minQty: number;
  priceNgn: number;
  priceUsd: number;
};

/** order = pay online (Paystack) or pending payment; booking = reserve & pay at shop */
export type OrderType = "order" | "booking";
export type PaymentMethod = "paystack" | "pay_at_shop" | "whatsapp";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export type OrderItem = {
  name: string;
  size: string;
  color: string;
  qty: number;
  priceNgn?: number;
  priceUsd?: number;
};

export type Order = {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  email?: string;
  delivery: string;
  address: string;
  notes: string;
  items: OrderItem[];
  totalNgn: number;
  totalUsd: number;
  /** Product subtotal only (before waybill) */
  subtotalNgn?: number;
  waybillFeeNgn?: number;
  currency: Currency;
  status: string;
  createdAt: number;
  orderType?: OrderType;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paystackReference?: string;
  paidAt?: number;
};

export const CATEGORIES = ["Men", "Women", "Hoodies", "Baggy", "Other"];
export const DELIVERY = ["Waybill to another state", "Pick-up in person", "Other"];
export const STATUSES = ["Pending", "Booked", "Confirmed/Paid", "Shipped", "Delivered", "Cancelled"];
export const DEFAULT_SETTINGS: Settings = {
  whatsapp: "2348138911483",
  rate: 1500,
  bannerTitle: "Built Different.",
  bannerSubtitle:
    "Trendy streetwear straight from the manufacturer. Wholesale prices for resellers across Nigeria.",
  deliveryInfo:
    "Waybill: we send to any state via trusted park/logistics partners. Waybill fee is paid online with your order (or on pickup if you book).\nPick-up: collect your order in person at our Lagos workshop after confirmation.\nOther: send us a message on the Contact page to arrange a custom option.",
  waybillFeeNgn: 2500,
  shopAddress: "Tejuosho (Tejuoso) Market Plaza, Yaba, Lagos — production & pick-up",
  announcement: "Wholesale prices for resellers · Nationwide waybill",
  contactEmail: "",
  openingHours: "Mon–Sat, 9am–6pm",
};
export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
export const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

export const fmt = (n: number, c: Currency) =>
  c === "NGN"
    ? "₦" + Math.round(n).toLocaleString("en-NG")
    : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const waLink = (num: string, text: string) =>
  `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

type Ctx = {
  user: User | null;
  isAdmin: boolean;
  isOwner: boolean;
  allProducts: Product[];
  authLoading: boolean;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  items: CartItem[];
  add: (i: Omit<CartItem, "key">) => void;
  setQty: (k: string, q: number) => void;
  remove: (k: string) => void;
  clear: () => void;
  count: number;
  total: (c: Currency) => number;
  settings: Settings;
  products: Product[];
  productsLoading: boolean;
};
const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setPL] = useState(true);
  const [listed, setListed] = useState(false);

  useEffect(() => {
    try {
      const c = localStorage.getItem("unik_currency");
      if (c === "NGN" || c === "USD") setCurrency(c);
      const i = localStorage.getItem("unik_cart");
      if (i) setItems(JSON.parse(i));
    } catch {}
    setLoaded(true);
    const u1 = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u?.email)
        getDoc(doc(db, "admins", u.email.toLowerCase()))
          .then((d) => setListed(d.exists()))
          .catch(() => setListed(false));
      else setListed(false);
      if (u)
        setDoc(
          doc(db, "users", u.uid),
          { email: u.email, name: u.displayName ?? "", lastLogin: Date.now() },
          { merge: true }
        ).catch(() => {});
    });
    const u2 = onSnapshot(
      doc(db, "settings", "main"),
      (s) => s.exists() && setSettings({ ...DEFAULT_SETTINGS, ...(s.data() as Settings), ...((s.data() as Settings).whatsapp === "2348000000000" ? { whatsapp: DEFAULT_SETTINGS.whatsapp } : {}) }),
      () => {}
    );
    const u3 = onSnapshot(
      collection(db, "products"),
      (s) => {
        setProducts(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) })));
        setPL(false);
      },
      () => setPL(false)
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("unik_cart", JSON.stringify(items));
      localStorage.setItem("unik_currency", currency);
    }
  }, [items, currency, loaded]);

  const isOwner = !!user && !!ADMIN_EMAIL && user.email?.toLowerCase() === ADMIN_EMAIL;
  const value = useMemo<Ctx>(
    () => ({
      user,
      authLoading,
      isOwner,
      isAdmin: isOwner || (!!user && listed),
      allProducts: products,
      currency,
      setCurrency,
      items,
      settings,
      products: products.filter((p) => !p.hidden),
      productsLoading,
      add: (i) => {
        const key = `${i.productId}-${i.size}-${i.color}`;
        setItems((p) =>
          p.some((x) => x.key === key)
            ? p.map((x) => (x.key === key ? { ...x, qty: x.qty + i.qty } : x))
            : [...p, { ...i, key }]
        );
      },
      setQty: (k, q) =>
        setItems((p) => p.map((x) => (x.key === k ? { ...x, qty: Math.max(x.minQty, q) } : x))),
      remove: (k) => setItems((p) => p.filter((x) => x.key !== k)),
      clear: () => setItems([]),
      count: items.reduce((s, i) => s + i.qty, 0),
      total: (c) =>
        items.reduce((s, i) => s + i.qty * (c === "NGN" ? i.priceNgn : i.priceUsd), 0),
    }),
    [user, authLoading, isOwner, listed, currency, items, settings, products, productsLoading]
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

/** Uploads an image to Cloudinary (unsigned preset) and returns an optimised URL. */
export async function uploadImage(file: File): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset)
    throw new Error(
      "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET."
    );
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", preset);
  body.append("folder", "unik-trends/products");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message ?? "Image upload failed");
  return (j.secure_url as string).replace("/upload/", "/upload/f_auto,q_auto,w_1000/");
}

/** Load Paystack inline script once. */
export function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if ((window as unknown as { PaystackPop?: unknown }).PaystackPop) return resolve();
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.body.appendChild(s);
  });
}

type PaystackHandler = {
  openIframe: () => void;
};

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => PaystackHandler;
    };
  }
}

export async function openPaystack(opts: {
  email: string;
  amountNgn: number;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}) {
  if (!PAYSTACK_PUBLIC_KEY) throw new Error("Paystack key not configured");
  await loadPaystack();
  if (!window.PaystackPop) throw new Error("Paystack failed to load");
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: opts.email,
    amount: Math.round(opts.amountNgn * 100), // kobo
    currency: "NGN",
    ref: opts.reference,
    metadata: opts.metadata,
    callback: (response) => opts.onSuccess(response.reference),
    onClose: opts.onClose,
  });
  handler.openIframe();
}
