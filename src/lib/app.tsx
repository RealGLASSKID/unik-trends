"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const SHOP_ADDRESS = "Tejuosho Plaza, Tejuosho Market, Yaba, Lagos, Nigeria";
export const MAP_QUERY = "Tejuosho Market, Yaba, Lagos, Nigeria";

export type Currency = "NGN" | "USD";
export type Variant = { color: string; images: string[]; stock: number; priceNgn?: number; priceUsd?: number };
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
  /** One entry per colour. Each colour has its own photos, stock and optional price. */
  variants?: Variant[];
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
  statusNote?: string;
  state?: string;
};

export const CATEGORIES = ["Men", "Women", "Hoodies", "Baggy", "Other"];
export const DELIVERY = ["Waybill", "Pick-up in person"];
/** Waybill destination states — Lagos area first, then the rest of Nigeria */
export const NIGERIA_STATES = [
  "Lagos",
  "Ogun",
  "Oyo",
  "Osun",
  "Ondo",
  "Ekiti",
  "Kwara",
  "Abuja (FCT)",
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Nasarawa",
  "Niger",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];
export const STATUSES_USER_FRIENDLY: Record<string, string> = {
  Pending: "Pending — waiting for confirmation",
  Booked: "Booked — pay & collect at the shop",
  "Confirmed/Paid": "Confirmed — payment received",
  Processing: "Processing your order",
  Shipped: "Shipped / on the way",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
  Unavailable: "Item unavailable — we will contact you",
};
export const STATUSES = ["Pending", "Booked", "Confirmed/Paid", "Processing", "Shipped", "Delivered", "Cancelled", "Unavailable"];
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
  contactEmail: "uniktrends83@gmail.com",
  openingHours: "Mon–Sat, 9am–6pm",
};
/** Owners/admins by email. Add more with NEXT_PUBLIC_ADMIN_EMAIL=a@x.com,b@x.com. Others can be added in Admin > Team. */
export const ADMIN_EMAILS = Array.from(new Set(["glasskid01@gmail.com", "uniktrends83@gmail.com", ...(process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean)]));
export const ADMIN_EMAIL = ADMIN_EMAILS[0]!;
export const isOwnerEmail = (e?: string | null) => !!e && ADMIN_EMAILS.includes(e.toLowerCase());

/** Fill missing fields so older / partial Firestore docs never crash the UI. */
export function normalizeProduct(id: string, raw: Record<string, unknown>): Product {
  const variants = Array.isArray(raw.variants) ? (raw.variants as Variant[]) : undefined;
  const colors = Array.isArray(raw.colors)
    ? (raw.colors as string[]).map(String)
    : variants?.map((v) => v.color).filter(Boolean) || [];
  const images = Array.isArray(raw.images)
    ? (raw.images as string[]).map(String).filter(Boolean)
    : variants?.[0]?.images?.length
      ? variants[0].images.map(String)
      : [];
  const stockFromVariants = variants?.reduce((n, v) => n + (Number(v.stock) || 0), 0);
  return {
    id,
    name: String(raw.name || "Untitled"),
    description: String(raw.description || ""),
    category: String(raw.category || "Other"),
    gender: String(raw.gender || "unisex"),
    sizes: Array.isArray(raw.sizes) ? (raw.sizes as string[]).map(String) : [],
    colors,
    images,
    stock: Number(raw.stock ?? stockFromVariants) || 0,
    minQty: Number(raw.minQty) || 1,
    priceNgn: Number(raw.priceNgn) || 0,
    priceUsd: Number(raw.priceUsd) || 0,
    featured: !!raw.featured,
    hidden: !!raw.hidden,
    variants,
  };
}

/** The colour options of a product. Older products without variants still work. */
export function variantsOf(p: Product): Variant[] {
  if (p.variants?.length) return p.variants.map((v) => ({
    color: v.color || "",
    images: Array.isArray(v.images) ? v.images : [],
    stock: Number(v.stock) || 0,
    priceNgn: v.priceNgn,
    priceUsd: v.priceUsd,
  }));
  if (p.colors?.length) {
    return p.colors.map((c) => ({
      color: c,
      images: p.images || [],
      stock: Number(p.stock) || 0,
    }));
  }
  return [{ color: "", images: p.images || [], stock: Number(p.stock) || 0 }];
}
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
      (s) => s.exists() && setSettings({ ...DEFAULT_SETTINGS, ...(s.data() as Settings), ...(!(s.data() as Settings).contactEmail ? { contactEmail: DEFAULT_SETTINGS.contactEmail } : {}), ...((s.data() as Settings).whatsapp === "2348000000000" ? { whatsapp: DEFAULT_SETTINGS.whatsapp } : {}) }),
      () => {}
    );
    const u3 = onSnapshot(
      collection(db, "products"),
      (s) => {
        setProducts(s.docs.map((d) => normalizeProduct(d.id, d.data() as Record<string, unknown>)));
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

  const isOwner = !!user && isOwnerEmail(user.email);
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
        // Admins manage the shop — only customers can add to cart
        if (isOwner || listed) {
          if (typeof window !== "undefined")
            alert("Admin accounts cannot add products to cart. Use a customer account to shop.");
          return;
        }
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
      "Cloudinary keys not found. In your .env.local file add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (the NEXT_PUBLIC_ part is required), then stop and restart the server."
    );
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is bigger than 10MB. Please use a smaller photo.`);
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", preset);
  let r: Response;
  try {
    r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  } catch {
    throw new Error("Could not reach Cloudinary. Check your internet connection.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m: string = j.error?.message ?? "Image upload failed";
    if (/whitelist|unsigned/i.test(m)) throw new Error('Cloudinary rejected the upload: set your upload preset "Signing mode" to Unsigned, then save it.');
    if (/preset/i.test(m) && /not found|invalid/i.test(m)) throw new Error(`Cloudinary cannot find preset "${preset}" in cloud "${cloud}". Make sure this cloud name is the account where you created the preset.`);
    if (/cloud/i.test(m) && /not found|invalid|disabled/i.test(m)) throw new Error("Cloudinary says the cloud name is wrong. Check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.");
    throw new Error(`Cloudinary: ${m}`);
  }
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
