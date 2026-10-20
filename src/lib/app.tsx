"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type Currency = "NGN" | "USD";
export type Product = { id: string; name: string; description: string; category: string; gender: string; sizes: string[]; colors: string[]; images: string[]; stock: number; minQty: number; priceNgn: number; priceUsd: number; featured: boolean; hidden?: boolean };
export type Settings = { whatsapp: string; rate: number; deliveryInfo: string; bannerTitle: string; bannerSubtitle: string };
export type CartItem = { key: string; productId: string; name: string; image: string; size: string; color: string; qty: number; minQty: number; priceNgn: number; priceUsd: number };

export const CATEGORIES = ["Men", "Women", "Hoodies", "Baggy", "Other"];
export const DELIVERY = ["Waybill to another state", "Pick-up in person", "Other"];
export const STATUSES = ["Pending", "Confirmed/Paid", "Shipped", "Delivered", "Cancelled"];
export const DEFAULT_SETTINGS: Settings = { whatsapp: "2348000000000", rate: 1500, bannerTitle: "Built Different.", bannerSubtitle: "Trendy streetwear straight from the manufacturer. Wholesale prices for resellers across Nigeria.", deliveryInfo: "Waybill: we send to any state via trusted park/logistics partners. Waybill fee is paid by the customer on pickup.\nPick-up: collect your order in person at our Lagos workshop after confirmation.\nOther: chat with us on WhatsApp to arrange a custom option." };
export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

export const fmt = (n: number, c: Currency) => c === "NGN" ? "₦" + Math.round(n).toLocaleString("en-NG") : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const waLink = (num: string, text: string) => `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

type Ctx = { user: User | null; isAdmin: boolean; isOwner: boolean; allProducts: Product[]; authLoading: boolean; currency: Currency; setCurrency: (c: Currency) => void; items: CartItem[]; add: (i: Omit<CartItem, "key">) => void; setQty: (k: string, q: number) => void; remove: (k: string) => void; clear: () => void; count: number; total: (c: Currency) => number; settings: Settings; products: Product[]; productsLoading: boolean };
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
      const c = localStorage.getItem("unik_currency"); if (c === "NGN" || c === "USD") setCurrency(c);
      const i = localStorage.getItem("unik_cart"); if (i) setItems(JSON.parse(i));
    } catch {}
    setLoaded(true);
    const u1 = onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthLoading(false);
      if (u?.email) getDoc(doc(db, "admins", u.email.toLowerCase())).then((d) => setListed(d.exists())).catch(() => setListed(false)); else setListed(false);
      if (u) setDoc(doc(db, "users", u.uid), { email: u.email, name: u.displayName ?? "", lastLogin: Date.now() }, { merge: true }).catch(() => {});
    });
    const u2 = onSnapshot(doc(db, "settings", "main"), (s) => s.exists() && setSettings({ ...DEFAULT_SETTINGS, ...(s.data() as Settings) }), () => {});
    const u3 = onSnapshot(collection(db, "products"), (s) => { setProducts(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) }))); setPL(false); }, () => setPL(false));
    return () => { u1(); u2(); u3(); };
  }, []);
  useEffect(() => { if (loaded) { localStorage.setItem("unik_cart", JSON.stringify(items)); localStorage.setItem("unik_currency", currency); } }, [items, currency, loaded]);

  const isOwner = !!user?.emailVerified && !!ADMIN_EMAIL && user.email?.toLowerCase() === ADMIN_EMAIL;
  const value = useMemo<Ctx>(() => ({
    user, authLoading, isOwner, isAdmin: isOwner || (!!user?.emailVerified && listed), allProducts: products,
    currency, setCurrency, items, settings, products: products.filter((p) => !p.hidden), productsLoading,
    add: (i) => { const key = `${i.productId}-${i.size}-${i.color}`; setItems((p) => p.some((x) => x.key === key) ? p.map((x) => x.key === key ? { ...x, qty: x.qty + i.qty } : x) : [...p, { ...i, key }]); },
    setQty: (k, q) => setItems((p) => p.map((x) => x.key === k ? { ...x, qty: Math.max(x.minQty, q) } : x)),
    remove: (k) => setItems((p) => p.filter((x) => x.key !== k)),
    clear: () => setItems([]),
    count: items.reduce((s, i) => s + i.qty, 0),
    total: (c) => items.reduce((s, i) => s + i.qty * (c === "NGN" ? i.priceNgn : i.priceUsd), 0),
  }), [user, authLoading, isOwner, listed, currency, items, settings, products, productsLoading]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

/** Uploads an image to Cloudinary (unsigned preset) and returns an optimised URL. */
export async function uploadImage(file: File): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
  const body = new FormData(); body.append("file", file); body.append("upload_preset", preset); body.append("folder", "unik-trends/products");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message ?? "Image upload failed");
  return (j.secure_url as string).replace("/upload/", "/upload/f_auto,q_auto,w_1000/");
}
