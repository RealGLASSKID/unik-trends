"use client";
import Link from "next/link";
import { MAP_QUERY, SHOP_ADDRESS } from "@/lib/app";

function Photo({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="aspect-[4/5] w-full object-cover bg-muted"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

export default function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <p className="eyebrow text-accent">About</p>
      <h1 className="mt-2 text-5xl md:text-7xl">Built different</h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
        UNIK TRENDS is a Nigerian streetwear label. We produce trendy pieces and sell them at
        wholesale prices for resellers — baggy denim, hoodies, sets and more — straight from our
        workshop in Tejuosho, Yaba, Lagos.
      </p>

      <section className="mt-14 grid gap-8 md:grid-cols-2 md:items-center">
        <div className="border-2 border-primary shadow-block overflow-hidden">
          <Photo src="/about-owner.jpg" alt="Michael — UNIK TRENDS" />
          <div className="bg-muted p-6 md:hidden">
            <p className="eyebrow text-accent">Founder</p>
            <h2 className="mt-1 text-2xl">Michael</h2>
          </div>
        </div>
        <div>
          <p className="eyebrow text-accent">Founder</p>
          <h2 className="mt-2 text-3xl md:text-4xl">Meet Michael</h2>
          <p className="mt-4 text-muted-foreground">
            Michael is the CEO behind UNIK TRENDS. He designs and cuts the styles, then works with
            his team so every piece is finished properly — joined, folded, detailed, ironed and
            checked — before it reaches resellers.
          </p>
          <p className="mt-3 text-muted-foreground">
            The goal is simple: quality streetwear at factory-direct wholesale prices, with clear
            ordering online or by booking pick-up at the shop.
          </p>
        </div>
      </section>

      <section className="mt-16">
        <p className="eyebrow text-accent">How we make it</p>
        <h2 className="mt-2 text-3xl">From cut to finished piece</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Production is a team effort. Michael cuts the style for each cloth, then different people
          on the line handle the next steps — joining the garment, folding, adding flex or prints
          when needed, ironing and final checks. That is how we keep quality consistent for
          wholesale orders.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[
            ["Cut", "Style is cut for each piece"],
            ["Join & finish", "Team sews and completes the garment"],
            ["Detail & press", "Design details, flex, iron and check"],
          ].map(([t, b]) => (
            <li key={t} className="border-2 border-primary p-5 shadow-block">
              <h3 className="text-lg">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <p className="eyebrow text-accent">Visit the shop</p>
        <h2 className="mt-2 text-3xl">Tejuosho, Yaba</h2>
        <p className="mt-3 text-muted-foreground">{SHOP_ADDRESS}</p>
        <div className="mt-6 border-2 border-primary shadow-block">
          <iframe
            title="UNIK TRENDS shop location"
            className="h-80 w-full"
            loading="lazy"
            src={`https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`}
          />
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/shop" className="btn btn-accent">
          Shop wholesale
        </Link>
        <Link href="/contact" className="btn btn-ghost">
          Contact us
        </Link>
        <Link href="/delivery" className="btn btn-ghost">
          Delivery options
        </Link>
      </div>
    </div>
  );
}
