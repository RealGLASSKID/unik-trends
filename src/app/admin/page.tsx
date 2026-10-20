"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sendEmailVerification } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { Copy, Eye, EyeOff, LayoutDashboard, Package, Settings as Cog, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import { db } from "@/lib/firebase";
import { ADMIN_EMAIL, CATEGORIES, DEFAULT_SETTINGS, STATUSES, fmt, uploadImage, useApp, waLink, type Product, type Settings } from "@/lib/app";
import type { Order } from "../account/page";

const LOW = 10;
const NAV = [["Overview", LayoutDashboard], ["Products", Package], ["Orders", ShoppingCart], ["Customers", Users], ["Team", ShieldCheck], ["Settings", Cog]] as const;
type Tab = (typeof NAV)[number][0];
type Draft = Omit<Product, "id"> & { id?: string };
const blank: Draft = { name: "", description: "", category: "Hoodies", gender: "unisex", sizes: [], colors: [], images: [], stock: 0, minQty: 1, priceNgn: 0, priceUsd: 0, featured: false, hidden: false };
const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);
const Badge = ({ c, children }: { c: string; children: React.ReactNode }) => <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${c}`}>{children}</span>;

export default function Admin() {
  const { user, isAdmin, isOwner, authLoading, allProducts: products, settings } = useApp();
  const [tab, setTab] = useState<Tab>("Overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name?: string; email?: string; phone?: string }[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdmin, setNewAdmin] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [s, setS] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(""); const [sel, setSel] = useState<string[]>([]); const [sent, setSent] = useState(false);
  useEffect(() => setS(settings), [settings]);
  useEffect(() => {
    if (!isAdmin) return;
    const a = onSnapshot(collection(db, "orders"), (x) => setOrders(x.docs.map((d) => ({ id: d.id, ...d.data() }) as Order).sort((p, r) => r.createdAt - p.createdAt)));
    const b = onSnapshot(collection(db, "users"), (x) => setCustomers(x.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const c = isOwner ? onSnapshot(collection(db, "admins"), (x) => setAdmins(x.docs.map((d) => d.id))) : () => {};
    return () => { a(); b(); c(); };
  }, [isAdmin, isOwner]);
  const shown = useMemo(() => products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())), [products, q]);
  const lowStock = products.filter((p) => p.stock <= LOW);

  if (authLoading) return <div className="px-4 py-20 text-center">Loading…</div>;
  if (!isAdmin) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-5xl">Admins only</h1>
      <p className="mt-3 text-muted-foreground">{!user ? "Log in with an admin email." : !user.emailVerified ? "Verify your email first, then refresh this page. Admin access needs a verified email." : "This account is not an admin."}</p>
      {user && !user.emailVerified && <button className="btn btn-accent mt-6" disabled={sent} onClick={() => sendEmailVerification(user).then(() => setSent(true))}>{sent ? "Verification email sent" : "Send verification email"}</button>}
      {!user && <Link href="/auth?next=/admin" className="btn mt-6">Log in</Link>}
    </div>
  );

  const bulk = async (fn: (id: string, b: ReturnType<typeof writeBatch>) => void) => { const b = writeBatch(db); sel.forEach((id) => fn(id, b)); await b.commit(); setSel([]); };
  const save = async () => {
    if (!draft) return; setBusy(true);
    const { id, ...data } = { ...draft, priceUsd: draft.priceUsd || Math.round((draft.priceNgn / settings.rate) * 100) / 100 };
    id ? await setDoc(doc(db, "products", id), data) : await addDoc(collection(db, "products"), data);
    setDraft(null); setBusy(false);
  };
  const upload = async (files: FileList | null) => {
    if (!files || !draft) return; setBusy(true);
    try { const urls = await Promise.all(Array.from(files).map(uploadImage)); setDraft({ ...draft, images: [...draft.images, ...urls] }); }
    catch (e) { alert((e as Error).message); }
    setBusy(false);
  };
  const num = (k: "stock" | "minQty" | "priceNgn" | "priceUsd", label: string) => <label className="grid gap-1 text-xs font-bold uppercase">{label}<input className="field" type="number" step="any" value={draft![k]} onChange={(e) => setDraft({ ...draft!, [k]: Number(e.target.value) })} /></label>;

  return (
    <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
      <aside className="shrink-0 bg-primary text-primary-foreground md:min-h-[calc(100vh-7rem)] md:w-56">
        <p className="hidden px-5 pt-6 font-display text-lg md:block">Admin</p>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-3">
          {NAV.filter(([t]) => t !== "Team" || isOwner).map(([t, Icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`flex shrink-0 items-center gap-3 px-3 py-2.5 text-sm font-bold ${tab === t ? "bg-accent text-accent-foreground" : "hover:bg-sidebar-accent"}`}><Icon className="h-4 w-4" />{t}</button>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 flex-1 p-4 md:p-8">
        <h1 className="text-4xl md:text-5xl">{tab}</h1>

        {tab === "Overview" && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Total orders", orders.length], ["Pending", orders.filter((o) => o.status === "Pending").length], ["Customers", customers.length], ["Low / out of stock", lowStock.length]].map(([l, n]) => <div key={l as string} className="border-2 border-primary p-5 shadow-block"><p className="font-display text-4xl">{n}</p><p className="text-sm text-muted-foreground">{l}</p></div>)}
          <div className="sm:col-span-2"><h2 className="mb-2 text-xl">Stock alerts</h2>{lowStock.length === 0 ? <p className="text-sm text-muted-foreground">All products are well stocked.</p> : lowStock.map((p) => <p key={p.id} className="flex justify-between border-b py-2 text-sm"><span>{p.name}</span><b className={p.stock <= 0 ? "text-destructive" : "text-accent"}>{p.stock <= 0 ? "Out of stock" : `${p.stock} left`}</b></p>)}</div>
          <div className="sm:col-span-2"><h2 className="mb-2 text-xl">Recent orders</h2>{orders.slice(0, 5).map((o) => <p key={o.id} className="border-b py-2 text-sm">{o.customerName} · {fmt(o.currency === "NGN" ? o.totalNgn : o.totalUsd, o.currency)} · {o.status}</p>)}{orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}</div>
        </div>}

        {tab === "Products" && <div className="mt-6">
          {draft ? <div className="grid max-w-2xl gap-3">
            <input className="field" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <textarea className="field" rows={3} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3"><select className="field" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select><select className="field" value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>{["men", "women", "unisex"].map((c) => <option key={c}>{c}</option>)}</select></div>
            <input className="field" placeholder="Sizes, comma separated (S, M, L)" defaultValue={draft.sizes.join(", ")} onBlur={(e) => setDraft({ ...draft, sizes: list(e.target.value) })} />
            <input className="field" placeholder="Colours, comma separated" defaultValue={draft.colors.join(", ")} onBlur={(e) => setDraft({ ...draft, colors: list(e.target.value) })} />
            <div className="grid grid-cols-2 gap-3">{num("priceNgn", "Price ₦")}{num("priceUsd", "Price $ (0 = auto from rate)")}{num("stock", "Stock")}{num("minQty", "Minimum order qty")}</div>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Show as trending</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!draft.hidden} onChange={(e) => setDraft({ ...draft, hidden: e.target.checked })} /> Hide from the shop</label>
            <input type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files)} />
            {busy && <p className="text-xs text-muted-foreground">Uploading…</p>}
            <div className="flex gap-2">{draft.images.map((u, i) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={i} src={u} alt="" className="h-20 w-16 cursor-pointer object-cover" title="Click to remove" onClick={() => setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })} />)}</div>
            <div className="flex gap-2"><button className="btn" disabled={busy || !draft.name} onClick={save}>{busy ? "Working…" : "Save product"}</button><button className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button></div>
          </div> : <>
            <div className="flex flex-wrap items-center gap-2">
              <input className="field max-w-xs" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn" onClick={() => setDraft(blank)}>Add product</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-y-2 border-primary py-2 text-sm">
              <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={shown.length > 0 && sel.length === shown.length} onChange={(e) => setSel(e.target.checked ? shown.map((p) => p.id) : [])} /> {sel.length ? `${sel.length} selected` : "Select all"}</label>
              {sel.length > 0 && <>
                <button className="chip" onClick={() => bulk((id, b) => b.update(doc(db, "products", id), { hidden: true }))}>Hide</button>
                <button className="chip" onClick={() => bulk((id, b) => b.update(doc(db, "products", id), { hidden: false }))}>Show</button>
                <button className="chip" onClick={() => bulk((id, b) => b.update(doc(db, "products", id), { featured: true }))}>Mark trending</button>
                <button className="chip" onClick={() => bulk((id, b) => b.update(doc(db, "products", id), { featured: false }))}>Unmark trending</button>
                <button className="chip" onClick={() => confirm(`Delete ${sel.length} products?`) && bulk((id, b) => b.delete(doc(db, "products", id)))}>Delete</button>
              </>}
            </div>
            <ul className="divide-y">{shown.length === 0 && <li className="py-6 text-sm text-muted-foreground">No products yet. Click “Add product” to create your first one.</li>}{shown.map((p) => (
              <li key={p.id} className={`flex flex-wrap items-center gap-3 py-3 ${p.hidden ? "opacity-60" : ""}`}>
                <input type="checkbox" checked={sel.includes(p.id)} onChange={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id])} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt="" className="h-14 w-11 bg-muted object-cover" />
                <div className="min-w-40 flex-1"><p className="font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{fmt(p.priceNgn, "NGN")} / {fmt(p.priceUsd, "USD")}</p>
                  <div className="mt-1 flex gap-1">{p.hidden && <Badge c="bg-muted">Hidden</Badge>}{p.featured && <Badge c="bg-accent text-accent-foreground">Trending</Badge>}{p.stock <= 0 ? <Badge c="bg-destructive text-destructive-foreground">Out of stock</Badge> : p.stock <= LOW && <Badge c="bg-accent text-accent-foreground">Low stock</Badge>}</div></div>
                <label className="text-xs font-bold uppercase">Stock <input className="field !w-20 !py-1" type="number" defaultValue={p.stock} key={p.stock} onBlur={(e) => Number(e.target.value) !== p.stock && updateDoc(doc(db, "products", p.id), { stock: Number(e.target.value) })} /></label>
                <button className="chip" title={p.hidden ? "Show in shop" : "Hide from shop"} onClick={() => updateDoc(doc(db, "products", p.id), { hidden: !p.hidden })}>{p.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                <button className="chip" title="Duplicate" onClick={() => { const { id, ...rest } = p; addDoc(collection(db, "products"), { ...rest, name: `${p.name} (copy)`, hidden: true }); }}><Copy className="h-4 w-4" /></button>
                <button className="chip" onClick={() => setDraft(p)}>Edit</button>
                <button className="chip" onClick={() => confirm("Delete this product?") && deleteDoc(doc(db, "products", p.id))}>Delete</button>
              </li>))}</ul>
          </>}
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

        {tab === "Team" && <div className="mt-6 max-w-xl">
          <p className="text-sm text-muted-foreground">Admins can manage products, orders and settings. They must sign in with a verified email. Only the owner can add or remove admins.</p>
          <form className="mt-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); const em = newAdmin.trim().toLowerCase(); if (!em) return; await setDoc(doc(db, "admins", em), { addedAt: Date.now() }); setNewAdmin(""); }}>
            <input className="field" type="email" placeholder="new.admin@email.com" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} /><button className="btn">Add admin</button>
          </form>
          <ul className="mt-4 divide-y text-sm"><li className="flex justify-between py-3"><span>{ADMIN_EMAIL}</span><Badge c="bg-primary text-primary-foreground">Owner</Badge></li>
            {admins.map((a) => <li key={a} className="flex items-center justify-between py-3"><span>{a}</span><button className="chip" onClick={() => confirm(`Remove ${a}?`) && deleteDoc(doc(db, "admins", a))}>Remove</button></li>)}</ul>
        </div>}

        {tab === "Settings" && <div className="mt-6 grid max-w-xl gap-3">
          <label className="grid gap-1 text-xs font-bold uppercase">WhatsApp number (with country code, e.g. 23480...)<input className="field" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-bold uppercase">Exchange rate (₦ per $1)<input className="field" type="number" value={s.rate} onChange={(e) => setS({ ...s, rate: Number(e.target.value) })} /></label>
          <label className="grid gap-1 text-xs font-bold uppercase">Homepage title<input className="field" value={s.bannerTitle} onChange={(e) => setS({ ...s, bannerTitle: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-bold uppercase">Homepage subtitle<textarea className="field" rows={2} value={s.bannerSubtitle} onChange={(e) => setS({ ...s, bannerSubtitle: e.target.value })} /></label>
          <label className="grid gap-1 text-xs font-bold uppercase">Delivery info<textarea className="field" rows={5} value={s.deliveryInfo} onChange={(e) => setS({ ...s, deliveryInfo: e.target.value })} /></label>
          <button className="btn" onClick={() => setDoc(doc(db, "settings", "main"), { ...DEFAULT_SETTINGS, ...s }).then(() => alert("Saved"))}>Save settings</button>
        </div>}
      </section>
    </div>
  );
}
