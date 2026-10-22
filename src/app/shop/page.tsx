"use client";
import { useEffect, useMemo, useState } from "react";
import { fmt, useApp } from "@/lib/app";
import { ProductCard } from "@/components/Chrome";
import { LogoLoader } from "@/components/Brand";

export default function Shop() {
  const { products, productsLoading, currency } = useApp();
  const [q, setQ] = useState(""); const [gender, setGender] = useState(""); const [category, setCategory] = useState(""); const [size, setSize] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null); const [banner, setBanner] = useState("");

  useEffect(() => {
    const s = new URLSearchParams(location.search);
    setGender(s.get("gender") ?? ""); setCategory(s.get("category") ?? "");
    if (s.get("booked")) setBanner("Booking received. Come to Tejuosho Plaza, Yaba to pay and collect. Our team already has your details.");
    else if (s.get("ordered")) setBanner(s.get("paid") ? "Payment received. Your order is confirmed and we will process waybill or pick-up next." : "Order saved. Our team will confirm payment with you.");
  }, []);

  const price = (p: { priceNgn: number; priceUsd: number }) => (currency === "NGN" ? p.priceNgn : p.priceUsd);
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))), [products]);
  const sizes = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes))), [products]);
  const top = useMemo(() => Math.ceil(Math.max(0, ...products.map(price))), [products, currency]); // eslint-disable-line
  const limit = maxPrice === null || maxPrice > top ? top : maxPrice;
  const list = products.filter((p) =>
    (!q || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase())) &&
    (!category || p.category === category) &&
    (!gender || p.gender === gender || p.gender === "unisex") &&
    (!size || p.sizes.includes(size)) && price(p) <= limit);
  const Chip = ({ on, set, children }: { on: boolean; set: () => void; children: React.ReactNode }) => <button onClick={set} className={`chip ${on ? "on" : ""}`}>{children}</button>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-5xl md:text-7xl">Shop</h1>
      {banner && <p className="mt-4 border-2 border-accent bg-accent/10 p-4 text-sm font-bold">{banner}</p>}
      {productsLoading ? <LogoLoader /> : products.length === 0 ? (
        <div className="mt-10 border-2 border-primary p-10 text-center"><h2 className="text-3xl">New pieces coming soon</h2><p className="mt-2 text-muted-foreground">Our latest drops are being added. Please check back shortly.</p></div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 border-b-2 border-primary pb-6">
            <input className="field max-w-md" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Chip on={!gender} set={() => setGender("")}>All</Chip><Chip on={gender === "men"} set={() => setGender(gender === "men" ? "" : "men")}>Men</Chip><Chip on={gender === "women"} set={() => setGender(gender === "women" ? "" : "women")}>Women</Chip>
              {categories.length > 0 && <span className="mx-2 w-px bg-border" />}
              {categories.map((c) => <Chip key={c} on={category === c} set={() => setCategory(category === c ? "" : c)}>{c}</Chip>)}
            </div>
            {sizes.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="eyebrow mr-1">Size</span>{sizes.map((s) => <Chip key={s} on={size === s} set={() => setSize(size === s ? "" : s)}>{s}</Chip>)}</div>}
            {top > 0 && <div className="flex items-center gap-4"><span className="eyebrow">Max price</span><input type="range" min={0} max={top} step={currency === "NGN" ? 100 : 1} value={limit} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-64 accent-[var(--accent)]" /><b className="text-sm">{fmt(limit, currency)}</b></div>}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">{list.length} products</p>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          {list.length === 0 && <p className="mt-10 text-center text-muted-foreground">No products match these filters.</p>}
        </>
      )}
    </div>
  );
}
