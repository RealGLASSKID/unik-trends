"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { fmt, useApp } from "@/lib/app";
import { CurrencyToggle } from "@/components/Chrome";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, productsLoading, currency, add } = useApp();
  const router = useRouter();
  const p = products.find((x) => x.id === id);
  const [img, setImg] = useState(0); const [size, setSize] = useState(""); const [color, setColor] = useState(""); const [qty, setQty] = useState(1);
  useEffect(() => { if (p) { setQty(p.minQty); setSize(p.sizes[0] ?? ""); setColor(p.colors[0] ?? ""); } }, [p?.id]); // eslint-disable-line
  if (productsLoading) return <div className="mx-auto max-w-7xl px-4 py-20">Loading…</div>;
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-20 text-center"><h1 className="text-4xl">Product not found</h1><Link href="/shop" className="mt-4 inline-block underline">Back to shop</Link></div>;
  const addToCart = (go: boolean) => { add({ productId: p.id, name: p.name, image: p.images[0] ?? "", size, color, qty, minQty: p.minQty, priceNgn: p.priceNgn, priceUsd: p.priceUsd }); if (go) router.push("/cart"); else alert("Added to cart"); };
  const opt = (on: boolean) => `border-2 border-primary px-3 py-2 text-sm font-bold ${on ? "bg-primary text-primary-foreground" : ""}`;
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <div className="aspect-[4/5] overflow-hidden bg-muted">{/* eslint-disable-next-line @next/next/no-img-element */}{p.images[img] && <img src={p.images[img]} alt={p.name} className="h-full w-full object-cover" />}</div>
        {p.images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{p.images.map((s, i) => <button key={i} onClick={() => setImg(i)} className={`h-20 w-16 shrink-0 border-2 ${i === img ? "border-accent" : "border-transparent"}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={s} alt="" className="h-full w-full object-cover" /></button>)}</div>}
      </div>
      <div>
        <span className="eyebrow text-accent">{p.category} · {p.gender}</span>
        <h1 className="mt-2 text-4xl md:text-5xl">{p.name}</h1>
        <div className="mt-4 flex items-center gap-4"><span className="text-3xl font-bold">{fmt(currency === "NGN" ? p.priceNgn : p.priceUsd, currency)}</span><CurrencyToggle /></div>
        <p className="mt-1 text-sm text-muted-foreground">{fmt(p.priceNgn, "NGN")} / {fmt(p.priceUsd, "USD")} per piece · wholesale</p>
        <p className="mt-6 leading-relaxed">{p.description}</p>
        {p.sizes.length > 0 && <div className="mt-6"><p className="eyebrow mb-2">Size</p><div className="flex flex-wrap gap-2">{p.sizes.map((s) => <button key={s} onClick={() => setSize(s)} className={opt(size === s)}>{s}</button>)}</div></div>}
        {p.colors.length > 0 && <div className="mt-5"><p className="eyebrow mb-2">Colour</p><div className="flex flex-wrap gap-2">{p.colors.map((c) => <button key={c} onClick={() => setColor(c)} className={opt(color === c)}>{c}</button>)}</div></div>}
        <div className="mt-5">
          <p className="eyebrow mb-2">Quantity · minimum {p.minQty}</p>
          <div className="flex w-fit items-center border-2 border-primary">
            <button className="p-3" onClick={() => setQty((q) => Math.max(p.minQty, q - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
            <input type="number" value={qty} onChange={(e) => setQty(Math.max(p.minQty, Number(e.target.value) || p.minQty))} className="w-16 bg-transparent text-center font-bold" />
            <button className="p-3" onClick={() => setQty((q) => q + 1)} aria-label="Increase"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{p.stock > 0 ? `${p.stock} in stock` : "Currently out of stock"}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button className="btn flex-1" disabled={p.stock <= 0} onClick={() => addToCart(false)}>Add to cart</button>
          <button className="btn btn-accent flex-1" disabled={p.stock <= 0} onClick={() => addToCart(true)}>Buy now</button>
        </div>
      </div>
    </div>
  );
}
