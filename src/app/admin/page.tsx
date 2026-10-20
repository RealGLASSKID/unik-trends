"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { CATEGORIES, DEFAULT_SETTINGS, SEED, STATUSES, fmt, useApp, waLink, type Product, type Settings } from "@/lib/app";
import type { Order } from "../account/page";

const TABS = ["Overview", "Products", "Orders", "Customers", "Settings"] as const;
type Draft = Omit<Product, "id"> & { id?: string };
const blank: Draft = { name: "", description: "", category: "Hoodies", gender: "unisex", sizes: [], colors: [], images: [], stock: 0, minQty: 1, priceNgn: 0, priceUsd: 0, featured: false };

export default function Admin() {
  const { user, isAdmin, authLoading, products, settings } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name?: string; email?: string; phone?: string }[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [s, setS] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setS(settings), [settings]);
  useEffect(() => {
    if (!isAdmin) return;
    const a = onSnapshot(collection(db, "orders"), (x) => setOrders(x.docs.map((d) => ({ id: d.id, ...d.data() }) as Order).sort((p, q) => q.createdAt - p.createdAt)));
    const b = onSnapshot(collection(db, "users"), (x) => setCustomers(x.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { a(); b(); };
  }, [isAdmin]);
  if (authLoading) return <div className="px-4 py-20 text-center">Loading…</div>;
  if (!isAdmin) return <div className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-5xl">Admins only</h1><p className="mt-3 text-muted-foreground">{user ? "This account is not the admin." : "Log in with the admin email."}</p><Link href={user ? "/" : "/auth?next=/admin"} className="btn mt-6">{user ? "Go home" : "Log in"}</Link></div>;

  const save = async () => {
    if (!draft) return; setBusy(true);
    const { id, ...data } = { ...draft, priceUsd: draft.priceUsd || Math.round((draft.priceNgn / settings.rate) * 100) / 100 };
    id ? await setDoc(doc(db, "products", id), data) : await addDoc(collection(db, "products"), data);
    setDraft(null); setBusy(false);
  };
  const upload = async (files: FileList | null) => {
    if (!files || !draft) return; setBusy(true);
    const urls = await Promise.all(Array.from(files).map(async (f) => { const r = ref(storage, `products/${Date.now()}-${f.name}`); await uploadBytes(r, f); return getDownloadURL(r); }));
    setDraft({ ...draft, images: [...draft.images, ...urls] }); setBusy(false);
  };
  const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
  const num = (k: "stock" | "minQty" | "priceNgn" | "priceUsd", label: string) => <label className="grid gap-1 text-xs font-bold uppercase">{label}<input className="field" type="number" step="any" value={draft![k]} onChange={(e) => setDraft({ ...draft!, [k]: Number(e.target.value) })} /></label>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-5xl">Admin</h1>
      <div className="mt-6 flex flex-wrap gap-2 border-b-2 border-primary pb-4">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`chip ${tab === t ? "on" : ""}`}>{t}</button>)}</div>

      {tab === "Overview" && <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[["Total orders", orders.length], ["Pending", orders.filter((o) => o.status === "Pending").length], ["Customers", customers.length], ["Products", products.length]].map(([l, n]) => <div key={l as string} className="border-2 border-primary p-5 shadow-block"><p className="font-display text-4xl">{n}</p><p className="text-sm text-muted-foreground">{l}</p></div>)}
        <div className="sm:col-span-4"><h2 className="mb-2 text-2xl">Recent orders</h2>{orders.slice(0, 5).map((o) => <p key={o.id} className="border-b py-2 text-sm">{o.customerName} · {fmt(o.currency === "NGN" ? o.totalNgn : o.totalUsd, o.currency)} · {o.status}</p>)}</div>
      </div>}

      {tab === "Products" && <div className="mt-6">
        {!draft && <div className="flex gap-2"><button className="btn" onClick={() => setDraft(blank)}>Add product</button>{products.length === 0 && <button className="btn btn-ghost" onClick={async () => { for (const p of SEED) await addDoc(collection(db, "products"), p); }}>Load demo products</button>}</div>}
        {draft ? <div className="mt-2 grid max-w-2xl gap-3">
          <input className="field" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <textarea className="field" rows={3} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3"><select className="field" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select><select className="field" value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>{["men", "women", "unisex"].map((c) => <option key={c}>{c}</option>)}</select></div>
          <input className="field" placeholder="Sizes, comma separated (S, M, L)" defaultValue={draft.sizes.join(", ")} onBlur={(e) => setDraft({ ...draft, sizes: list(e.target.value) })} />
          <input className="field" placeholder="Colours, comma separated" defaultValue={draft.colors.join(", ")} onBlur={(e) => setDraft({ ...draft, colors: list(e.target.value) })} />
          <div className="grid grid-cols-2 gap-3">{num("priceNgn", "Price ₦")}{num("priceUsd", "Price $ (0 = auto from rate)")}{num("stock", "Stock")}{num("minQty", "Minimum order qty")}</div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Show as trending</label>
          <input type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} />
          <div className="flex gap-2">{draft.images.map((u, i) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={i} src={u} alt="" className="h-20 w-16 cursor-pointer object-cover" title="Click to remove" onClick={() => setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })} />)}</div>
          <div className="flex gap-2"><button className="btn" disabled={busy || !draft.name} onClick={save}>{busy ? "Working…" : "Save product"}</button><button className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button></div>
        </div> : <ul className="mt-4 divide-y">{products.map((p) => <li key={p.id} className="flex items-center gap-3 py-3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.images[0]} alt="" className="h-14 w-11 bg-muted object-cover" /><div className="flex-1"><p className="font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{fmt(p.priceNgn, "NGN")} / {fmt(p.priceUsd, "USD")} · stock {p.stock}</p></div><button className="chip" onClick={() => setDraft(p)}>Edit</button><button className="chip" onClick={() => confirm("Delete this product?") && deleteDoc(doc(db, "products", p.id))}>Delete</button></li>)}</ul>}
      </div>}

      {tab === "Orders" && <ul className="mt-6 grid gap-3">{orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}{orders.map((o) => (
        <li key={o.id} className="border-2 border-primary p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><b>{o.customerName} · {o.phone}</b><span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</span></div>
          <p className="mt-2">{o.items.map((i) => `${i.qty}× ${i.name} (${[i.size, i.color].filter(Boolean).join(", ")})`).join("; ")}</p>
          <p className="mt-1 text-muted-foreground">{o.delivery}{o.address ? ` · ${o.address}` : ""}{o.notes ? ` · ${o.notes}` : ""}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3"><b>{fmt(o.totalNgn, "NGN")} / {fmt(o.totalUsd, "USD")}</b>
            <select className="field w-auto" value={o.status} onChange={(e) => updateDoc(doc(db, "orders", o.id), { status: e.target.value })}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
            <a className="btn btn-wa !py-2" target="_blank" rel="noreferrer" href={waLink(o.phone, `Hi ${o.customerName}, this is UNIK TRENDS about your order #${o.id.slice(0, 6)}.`)}>WhatsApp</a></div>
        </li>))}</ul>}

      {tab === "Customers" && <ul className="mt-6 divide-y text-sm">{customers.map((c) => <li key={c.id} className="py-3"><b>{c.name || "No name"}</b> · {c.email} {c.phone && `· ${c.phone}`}</li>)}</ul>}

      {tab === "Settings" && <div className="mt-6 grid max-w-xl gap-3">
        <label className="grid gap-1 text-xs font-bold uppercase">WhatsApp number (with country code, e.g. 23480...)<input className="field" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></label>
        <label className="grid gap-1 text-xs font-bold uppercase">Exchange rate (₦ per $1)<input className="field" type="number" value={s.rate} onChange={(e) => setS({ ...s, rate: Number(e.target.value) })} /></label>
        <label className="grid gap-1 text-xs font-bold uppercase">Homepage title<input className="field" value={s.bannerTitle} onChange={(e) => setS({ ...s, bannerTitle: e.target.value })} /></label>
        <label className="grid gap-1 text-xs font-bold uppercase">Homepage subtitle<textarea className="field" rows={2} value={s.bannerSubtitle} onChange={(e) => setS({ ...s, bannerSubtitle: e.target.value })} /></label>
        <label className="grid gap-1 text-xs font-bold uppercase">Delivery info<textarea className="field" rows={5} value={s.deliveryInfo} onChange={(e) => setS({ ...s, deliveryInfo: e.target.value })} /></label>
        <button className="btn" onClick={() => setDoc(doc(db, "settings", "main"), { ...DEFAULT_SETTINGS, ...s }).then(() => alert("Saved"))}>Save settings</button>
      </div>}
    </div>
  );
}
