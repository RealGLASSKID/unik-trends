"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DELIVERY, fmt, useApp, waLink } from "@/lib/app";

export default function Checkout() {
  const { user, authLoading, items, currency, total, clear, settings } = useApp();
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", delivery: DELIVERY[0]!, address: "", notes: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { if (user && !f.name) setF((x) => ({ ...x, name: user.displayName ?? "" })); }, [user]); // eslint-disable-line
  useEffect(() => { if (!authLoading && !user) router.replace("/auth?next=/checkout"); }, [authLoading, user, router]);
  if (!items.length) return <div className="px-4 py-24 text-center"><h1 className="text-5xl">Nothing to check out</h1><Link href="/shop" className="btn mt-8">Go shopping</Link></div>;
  if (!user) return <div className="px-4 py-24 text-center">Redirecting to login…</div>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const ref = await addDoc(collection(db, "orders"), { userId: user.uid, customerName: f.name, phone: f.phone, delivery: f.delivery, address: f.address, notes: f.notes, items: items.map(({ name, size, color, qty, priceNgn, priceUsd }) => ({ name, size, color, qty, priceNgn, priceUsd })), totalNgn: total("NGN"), totalUsd: total("USD"), currency, status: "Pending", createdAt: Date.now() });
      const lines = items.map((i) => `• ${i.qty}× ${i.name} (${[i.size, i.color].filter(Boolean).join(", ")})`).join("\n");
      const text = `Hi UNIK TRENDS, I just placed order #${ref.id.slice(0, 6)}.\n\n${lines}\n\nTotal: ${fmt(total("NGN"), "NGN")} / ${fmt(total("USD"), "USD")}\nName: ${f.name}\nPhone: ${f.phone}\nDelivery: ${f.delivery}${f.address ? `\nAddress: ${f.address}` : ""}${f.notes ? `\nNotes: ${f.notes}` : ""}\n\nPlease confirm and send payment details.`;
      clear(); window.open(waLink(settings.whatsapp, text), "_blank"); router.push("/account");
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="grid gap-3">
        <h1 className="text-5xl">Checkout</h1>
        <p className="text-sm text-muted-foreground">No online payment. After you submit, WhatsApp opens with your order so you can pay or negotiate with the owner.</p>
        <input className="field" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="field" placeholder="Phone / WhatsApp number" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
        <select className="field" value={f.delivery} onChange={(e) => setF({ ...f, delivery: e.target.value })}>{DELIVERY.map((d) => <option key={d}>{d}</option>)}</select>
        <input className="field" placeholder={f.delivery === DELIVERY[1] ? "Pick-up notes (optional)" : "Address / waybill terminal and state"} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} required={f.delivery === DELIVERY[0]} />
        <textarea className="field" rows={3} placeholder="Notes (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className="btn btn-wa" disabled={busy}>{busy ? "Placing order…" : "Place order & chat on WhatsApp"}</button>
      </form>
      <aside className="h-fit border-2 border-primary p-6 shadow-block">
        <h2 className="text-2xl">Order</h2>
        <ul className="mt-3 grid gap-1 text-sm">{items.map((i) => <li key={i.key}>{i.qty}× {i.name} <span className="text-muted-foreground">({[i.size, i.color].filter(Boolean).join(", ")})</span></li>)}</ul>
        <p className="mt-4 text-lg font-bold">{fmt(total(currency), currency)}</p>
      </aside>
    </div>
  );
}
