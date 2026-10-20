"use client";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, useApp } from "@/lib/app";
import { ProductCard } from "@/components/Chrome";

export default function Shop() {
  const { products, productsLoading } = useApp();
  const [q, setQ] = useState(""); const [gender, setGender] = useState(""); const [category, setCategory] = useState(""); const [size, setSize] = useState("");
  useEffect(() => { const s = new URLSearchParams(location.search); setGender(s.get("gender") ?? ""); setCategory(s.get("category") ?? ""); }, []);
  const sizes = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes))), [products]);
  const list = products.filter((p) => (!q || `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())) && (!category || p.category === category) && (!gender || p.gender === gender || p.gender === "unisex") && (!size || p.sizes.includes(size)));
  const Chip = ({ on, set, children }: { on: boolean; set: () => void; children: React.ReactNode }) => <button onClick={set} className={`chip ${on ? "on" : ""}`}>{children}</button>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-5xl md:text-7xl">Shop</h1>
      <div className="mt-6 grid gap-4 border-b-2 border-primary pb-6">
        <input className="field max-w-md" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Chip on={!gender} set={() => setGender("")}>All</Chip><Chip on={gender === "men"} set={() => setGender("men")}>Men</Chip><Chip on={gender === "women"} set={() => setGender("women")}>Women</Chip>
          <span className="mx-2 w-px bg-border" />
          {CATEGORIES.map((c) => <Chip key={c} on={category === c} set={() => setCategory(category === c ? "" : c)}>{c}</Chip>)}
        </div>
        {sizes.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="eyebrow mr-1">Size</span>{sizes.map((s) => <Chip key={s} on={size === s} set={() => setSize(size === s ? "" : s)}>{s}</Chip>)}</div>}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{list.length} products</p>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
        {productsLoading ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse bg-muted" />) : list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
