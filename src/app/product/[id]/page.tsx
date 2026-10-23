"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { fmt, useApp, variantsOf } from "@/lib/app";
import { CurrencyToggle } from "@/components/Chrome";
import { LogoLoader } from "@/components/Brand";
import { DOT } from "@/components/VariantEditor";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products: shopProducts, allProducts, productsLoading, currency, add, settings, isAdmin } = useApp();
  const router = useRouter();
  const catalog = allProducts?.length ? allProducts : shopProducts;
  const p = catalog.find((x) => x.id === id);
  const [img, setImg] = useState(0); const [size, setSize] = useState(""); const [color, setColor] = useState(""); const [qty, setQty] = useState(2);
  useEffect(() => { if (p) { setQty(p.minQty); setSize((p.sizes || [])[0] ?? ""); setColor(variantsOf(p)[0]?.color ?? ""); setImg(0); } }, [p?.id]); // eslint-disable-line
  if (productsLoading) return <LogoLoader />;
  if (!p) return <div className="mx-auto max-w-7xl px-4 py-20 text-center"><h1 className="text-4xl">Product not found</h1><Link href="/shop" className="mt-4 inline-block underline">Back to shop</Link></div>;

  const variants = variantsOf(p);
  const v = variants.find((x) => x.color === color) ?? variants[0]!;
  const images = v.images.length ? v.images : p.images;
  const priceNgn = v.priceNgn ?? p.priceNgn;
  const priceUsd = v.priceUsd ?? (v.priceNgn ? Math.round((v.priceNgn / (settings.rate || 1)) * 100) / 100 : p.priceUsd);
  const stock = v.stock;
  const pickColor = (c: string) => { setColor(c); setImg(0); };
  const addToCart = (go: boolean) => {
    if (isAdmin) {
      alert("Admin accounts cannot add products to cart. Sign in with a customer account to shop.");
      return;
    }
    add({ productId: p.id, name: p.name, image: images[0] ?? "", size, color, qty, minQty: p.minQty, priceNgn, priceUsd });
    if (go) router.push("/cart");
    else alert("Added to cart");
  };
  const opt = (on: boolean) => `border-2 border-primary px-3 py-2 text-sm font-bold ${on ? "bg-primary text-primary-foreground" : ""}`;
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <div className="aspect-[4/5] overflow-hidden bg-muted">{/* eslint-disable-next-line @next/next/no-img-element */}{images[img] && <img src={images[img]} alt={`${p.name} ${color}`} className="h-full w-full object-cover" />}</div>
        {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((s, i) => <button key={s + i} onClick={() => setImg(i)} className={`h-20 w-16 shrink-0 border-2 ${i === img ? "border-accent" : "border-transparent"}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={s} alt="" className="h-full w-full object-cover" /></button>)}</div>}
      </div>
      <div>
        <span className="eyebrow text-accent">{p.category} · {p.gender}</span>
        <h1 className="mt-2 text-4xl md:text-5xl">{p.name}</h1>
        <div className="mt-4 flex items-center gap-4"><span className="text-3xl font-bold">{fmt(currency === "NGN" ? priceNgn : priceUsd, currency)}</span><CurrencyToggle /></div>
        <p className="mt-1 text-sm text-muted-foreground">{fmt(priceNgn, "NGN")} / {fmt(priceUsd, "USD")} per piece · wholesale</p>
        <p className="mt-6 leading-relaxed">{p.description}</p>
        {variants.some((x) => x.color) && <div className="mt-6"><p className="eyebrow mb-2">Colour: <span className="text-accent">{color}</span></p><div className="flex flex-wrap gap-2">{variants.map((x) => <button key={x.color} onClick={() => pickColor(x.color)} className={`${opt(color === x.color)} flex items-center gap-2 ${x.stock <= 0 ? "opacity-50" : ""}`}>{DOT[x.color.toLowerCase()] && <span className="h-4 w-4 rounded-full border border-neutral-400" style={{ background: DOT[x.color.toLowerCase()] }} />}{x.color}</button>)}</div></div>}
        {(p.sizes?.length ?? 0) > 0 && <div className="mt-5"><p className="eyebrow mb-2">Size</p><div className="flex flex-wrap gap-2">{(p.sizes || []).map((s) => <button key={s} onClick={() => setSize(s)} className={opt(size === s)}>{s}</button>)}</div></div>}
        <div className="mt-5">
          <p className="eyebrow mb-2">Quantity · minimum {p.minQty}</p>
          <div className="flex w-fit items-center border-2 border-primary">
            <button className="p-3" onClick={() => setQty((q) => Math.max(p.minQty, q - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
            <input type="number" value={qty} onChange={(e) => setQty(Math.max(p.minQty, Number(e.target.value) || p.minQty))} className="w-16 bg-transparent text-center font-bold" />
            <button className="p-3" onClick={() => setQty((q) => q + 1)} aria-label="Increase"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{stock > 0 ? `${stock} in stock${color ? ` in ${color}` : ""}` : `${color || "This item"} is currently out of stock`}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isAdmin ? (
            <p className="flex-1 border-2 border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              You are signed in as admin. Use a customer account to add items to cart and checkout.
            </p>
          ) : (
            <>
              <button className="btn flex-1" disabled={stock <= 0} onClick={() => addToCart(false)}>Add to cart</button>
              <button className="btn btn-accent flex-1" disabled={stock <= 0} onClick={() => addToCart(true)}>Buy now</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
