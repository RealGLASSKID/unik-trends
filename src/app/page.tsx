"use client";
import Link from "next/link";
import { ArrowRight, Package, Tag, Truck } from "lucide-react";
import { useApp } from "@/lib/app";
import { ProductCard } from "@/components/Chrome";

const CATS = [["Men", "/shop?gender=men", "/images/baggy-jeans.jpg"], ["Women", "/shop?gender=women", "/images/women-set.jpg"], ["Hoodies", "/shop?category=Hoodies", "/images/hoodie.jpg"], ["Baggy", "/shop?category=Baggy", "/images/baggy-jeans.jpg"]];

export default function Home() {
  const { settings, products } = useApp();
  const featured = products.filter((p) => p.featured).slice(0, 8);
  return (
    <>
      <section className="relative h-[78vh] min-h-[520px] overflow-hidden bg-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.jpg" alt="UNIK TRENDS streetwear" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14">
          <h1 className="max-w-3xl text-5xl leading-[0.9] text-primary-foreground md:text-8xl">{settings.bannerTitle}</h1>
          <p className="mt-4 max-w-lg text-primary-foreground/80">{settings.bannerSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-accent">Shop now <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/delivery" className="btn btn-ghost border-primary-foreground text-primary-foreground">How ordering works</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-3xl md:text-5xl">Categories</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {CATS.map(([l, h, img]) => (
            <Link key={l} href={h} className="group relative aspect-square overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={l} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <span className="absolute bottom-3 left-3 bg-background px-3 py-1 font-display text-lg">{l}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-end justify-between"><h2 className="text-3xl md:text-5xl">Trending now</h2><Link href="/shop" className="eyebrow hover:text-accent">View all</Link></div>
        {featured.length === 0 ? <p className="text-muted-foreground">No products yet. Check back soon.</p> :
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>
      <section className="mx-auto mt-16 max-w-7xl px-4">
        <div className="grid gap-8 border-2 border-primary p-8 shadow-block md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-4xl md:text-5xl">Wholesale prices. Your profit.</h2>
            <p className="mt-4 text-muted-foreground">We manufacture everything ourselves, so you buy at factory prices and resell at retail. Order in bulk, confirm on WhatsApp, and we ship to any state.</p>
            <Link href="/shop" className="btn mt-6">Start your order</Link>
          </div>
          <ul className="grid gap-5">
            {[[Tag, "Factory-direct pricing", "No middlemen, maximum margin for you."], [Package, "Low minimum orders", "MOQ shown on every product."], [Truck, "Waybill or pick-up", "We send nationwide or you collect in Lagos."]].map(([I, t, d]) => {
              const Icon = I as typeof Tag;
              return <li key={t as string} className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center bg-primary text-primary-foreground"><Icon /></span><div><p className="font-bold">{t as string}</p><p className="text-sm text-muted-foreground">{d as string}</p></div></li>;
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
