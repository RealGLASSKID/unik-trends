"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, MessageCircle, ShoppingBag, User, X } from "lucide-react";
import { fmt, useApp, waLink } from "@/lib/app";

const NAV = [["/shop", "Shop"], ["/about", "About"], ["/delivery", "Delivery"], ["/contact", "Contact"]];

export function Logo({ inverted }: { inverted?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 leading-none" aria-label="UNIK TRENDS home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="UNIK TRENDS"
        className={`h-9 w-auto ${inverted ? "brightness-0 invert" : ""}`}
      />
    </Link>
  );
}
export function CurrencyToggle() {
  const { currency, setCurrency } = useApp();
  return <div className="flex border-2 border-primary text-xs font-bold" role="group" aria-label="Currency">{(["NGN", "USD"] as const).map((c) => <button key={c} onClick={() => setCurrency(c)} className={`px-2 py-1 ${currency === c ? "bg-primary text-primary-foreground" : ""}`}>{c === "NGN" ? "₦" : "$"}</button>)}</div>;
}
export function Header() {
  const { count, user, isAdmin } = useApp();
  const [open, setOpen] = useState(false);
  const links = [...NAV, [user ? "/account" : "/auth", "Account"], ...(isAdmin ? [["/admin", "Admin"]] : [])];
  return (
    <header className="sticky top-0 z-40 border-b-2 border-primary bg-background">
      <div className="bg-primary py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground">Wholesale prices for resellers · Nationwide waybill</div>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <button className="md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <Logo />
        <nav className="ml-8 hidden gap-6 md:flex">{links.map(([h, l]) => <Link key={l} href={h} className="eyebrow hover:text-accent">{l}</Link>)}</nav>
        <div className="ml-auto flex items-center gap-3">
          <CurrencyToggle />
          <Link href={user ? "/account" : "/auth"} aria-label="Account" className="p-1"><User className="h-5 w-5" /></Link>
          <Link href="/cart" aria-label="Cart" className="relative p-1"><ShoppingBag className="h-5 w-5" />{count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{count}</span>}</Link>
        </div>
      </div>
      {open && <nav className="flex flex-col gap-4 border-t-2 border-primary p-4 md:hidden">{links.map(([h, l]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="font-display text-2xl">{l}</Link>)}</nav>}
    </header>
  );
}
export function Footer() {
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2"><Logo inverted /><p className="mt-4 max-w-sm text-sm opacity-70">Trendy streetwear made in Nigeria. Baggy denim, heavyweight hoodies and more, at wholesale prices for resellers.</p></div>
        <div className="flex flex-col gap-2 text-sm"><span className="eyebrow mb-2 text-accent">Shop</span><Link href="/shop">All products</Link><Link href="/cart">Cart</Link></div>
        <div className="flex flex-col gap-2 text-sm"><span className="eyebrow mb-2 text-accent">Info</span><Link href="/about">About</Link><Link href="/delivery">Delivery &amp; Pick-up</Link><Link href="/contact">Contact</Link><Link href="/account">My account</Link></div>
      </div>
      <div className="border-t border-sidebar-border py-4 text-center text-xs opacity-60">© {new Date().getFullYear()} UNIK TRENDS. All rights reserved.</div>
    </footer>
  );
}
export function WhatsAppButton() {
  const { settings } = useApp();
  return <a href={waLink(settings.whatsapp, "Hi UNIK TRENDS, I'd like to make an enquiry.")} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lg"><MessageCircle className="h-7 w-7" /></a>;
}
export function ProductCard({ p }: { p: { id: string; name: string; images: string[]; category: string; minQty: number; priceNgn: number; priceUsd: number; featured: boolean; stock: number } }) {
  const { currency } = useApp();
  const price = currency === "NGN" ? p.priceNgn : p.priceUsd;
  return (
    <Link href={`/product/${p.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {p.images[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        {p.featured && <span className="eyebrow absolute left-2 top-2 bg-accent px-2 py-1 text-accent-foreground">Trending</span>}
        {p.stock <= 0 && <span className="eyebrow absolute right-2 top-2 bg-primary px-2 py-1 text-primary-foreground">Sold out</span>}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2"><div><h3 className="font-sans text-sm font-bold normal-case tracking-normal">{p.name}</h3><p className="text-xs text-muted-foreground">{p.category} · MOQ {p.minQty}</p></div><span className="text-sm font-bold">{fmt(price, currency)}</span></div>
    </Link>
  );
}
