"use client";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Factory,
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { useApp, fmt } from "@/lib/app";
import { ProductCard } from "@/components/Chrome";

const CATS = [
  ["Men", "/shop?gender=men", "/images/baggy-jeans.jpg"],
  ["Women", "/shop?gender=women", "/images/women-set.jpg"],
  ["Hoodies", "/shop?category=Hoodies", "/images/hoodie.jpg"],
  ["Baggy", "/shop?category=Baggy", "/images/baggy-jeans.jpg"],
];

const STEPS = [
  {
    n: "01",
    title: "Browse & add to cart",
    body: "Pick sizes, colours and quantities. Every item shows the minimum order quantity (MOQ).",
  },
  {
    n: "02",
    title: "Book or order",
    body: "At checkout choose Book (pay at our Tejuosho shop) or Order online (pay with Paystack when enabled).",
  },
  {
    n: "03",
    title: "Pick up or waybill",
    body: "Collect in person at Yaba, or choose waybill to another state — the waybill fee is added to your total.",
  },
  {
    n: "04",
    title: "We process it",
    body: "Your booking or order appears on our dashboard instantly. No back-and-forth negotiation required.",
  },
];

export default function Home() {
  const { settings, products } = useApp();
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const waybill = settings.waybillFeeNgn ?? 2500;

  return (
    <>
      {/* Hero */}
      <section className="relative h-[78vh] min-h-[520px] overflow-hidden bg-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero.jpg"
          alt="UNIK TRENDS streetwear"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14">
          <h1 className="max-w-3xl text-5xl leading-[0.9] text-primary-foreground md:text-8xl">
            {settings.bannerTitle}
          </h1>
          <p className="mt-4 max-w-lg text-primary-foreground/80">
            {settings.bannerSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-accent">
              Shop now <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn btn-ghost border-primary-foreground text-primary-foreground">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b-2 border-primary bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3">
          {[
            [Factory, "Factory-direct", "We manufacture — you buy wholesale"],
            [Store, "Tejuosho, Yaba", "Pick up at our Lagos production shop"],
            [Truck, "Nationwide waybill", `Ship to any state · from ${fmt(waybill, "NGN")}`],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Factory;
            return (
              <div key={t as string} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center bg-primary text-primary-foreground">
                  <I className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">{t as string}</p>
                  <p className="text-xs text-muted-foreground">{d as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-3xl md:text-5xl">Categories</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {CATS.map(([l, h, img]) => (
            <Link
              key={l}
              href={h}
              className="group relative aspect-square overflow-hidden bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={l}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <span className="absolute bottom-3 left-3 bg-background px-3 py-1 font-display text-lg">
                {l}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl md:text-5xl">Trending now</h2>
          <Link href="/shop" className="eyebrow hover:text-accent">
            View all
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-muted-foreground">No products yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y-2 border-primary bg-muted/40 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl md:text-5xl">How ordering works</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            No long chats to place an order. Choose your pieces, check out, and we handle the rest
            from our dashboard.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="border-2 border-primary bg-background p-6">
                <span className="font-display text-3xl text-accent">{s.n}</span>
                <h3 className="mt-3 text-lg leading-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Delivery detail */}
      <section id="delivery" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-3xl md:text-5xl">Delivery &amp; pick-up</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Two clear options at checkout — pick what fits you.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="border-2 border-primary p-6 shadow-block">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center bg-primary text-primary-foreground">
                <Store className="h-6 w-6" />
              </span>
              <h3 className="font-display text-2xl">Book &amp; pick up</h3>
            </div>
            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Reserve stock online — no payment yet
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Come to our shop at Tejuosho Plaza, Yaba, Lagos
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Pay on the spot (transfer or cash) and take your goods
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Best if you are in Lagos or want to inspect quality first
              </li>
            </ul>
          </div>
          <div className="border-2 border-primary p-6 shadow-block">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center bg-accent text-accent-foreground">
                <Truck className="h-6 w-6" />
              </span>
              <h3 className="font-display text-2xl">Order + waybill</h3>
            </div>
            <ul className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Pay online with Paystack when the key is active
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Choose waybill to any state — fee currently{" "}
                <b className="text-foreground">{fmt(waybill, "NGN")}</b>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Waybill fee is added to your checkout total (no surprises)
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Or order for Lagos pick-up after online payment
              </li>
            </ul>
          </div>
        </div>
        {settings.deliveryInfo && (
          <div className="mt-8 border-2 border-border bg-secondary p-6 text-sm text-muted-foreground whitespace-pre-line">
            {settings.deliveryInfo}
          </div>
        )}
      </section>

      {/* Why wholesale */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 border-2 border-primary p-8 shadow-block md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-4xl md:text-5xl">Wholesale prices. Your profit.</h2>
            <p className="mt-4 text-muted-foreground">
              We manufacture everything ourselves, so you buy at factory prices and resell at
              retail. Order in bulk, check out on the site, and we ship or hold for pick-up.
            </p>
            <Link href="/shop" className="btn mt-6">
              Start your order
            </Link>
          </div>
          <ul className="grid gap-5">
            {[
              [Tag, "Factory-direct pricing", "No middlemen, maximum margin for you."],
              [Package, "Low minimum orders", "MOQ shown on every product."],
              [ShieldCheck, "Clear process", "Book or order online — status tracked by our team."],
            ].map(([I, t, d]) => {
              const Icon = I as typeof Tag;
              return (
                <li key={t as string} className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center bg-primary text-primary-foreground">
                    <Icon />
                  </span>
                  <div>
                    <p className="font-bold">{t as string}</p>
                    <p className="text-sm text-muted-foreground">{d as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Shop address — map lives on Contact only */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="border-2 border-primary p-8 shadow-block md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <h2 className="text-3xl md:text-5xl">Visit the shop</h2>
            <p className="mt-4 text-muted-foreground">
              <b className="text-foreground">Tejuosho (Tejuoso) Market Plaza</b>, Yaba, Lagos —
              production floor and pick-up for bookings.
            </p>
          </div>
          <Link href="/contact" className="btn btn-accent mt-6 shrink-0 md:mt-0">
            Contact &amp; directions
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-3xl md:text-5xl">Ready to restock?</h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/70">
            Browse the catalogue, add what you need, then book for pick-up or order for waybill.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="btn btn-accent">
              Open shop
            </Link>
            <Link
              href="/contact"
              className="btn btn-ghost border-primary-foreground text-primary-foreground"
            >
              Ask a question
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
