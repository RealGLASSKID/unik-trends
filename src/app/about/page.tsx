"use client";
import Link from "next/link";
import { MAP_QUERY, SHOP_ADDRESS, useApp } from "@/lib/app";

/** Photo slot: shows /public/<src> and hides itself until you add the file. */
function Photo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="aspect-[4/3] bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
    </div>
  );
}

export default function About() {
  const { settings } = useApp();
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-5xl md:text-7xl">About us</h1>
      <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
        UNIK TRENDS is a Nigerian clothing manufacturer making baggy jeans, hoodies and streetwear for men and women. We sell at wholesale prices so resellers can buy in bulk and resell at retail.
      </p>

      <section className="mt-14 grid items-center gap-8 md:grid-cols-2">
        <div className="border-2 border-primary shadow-block"><Photo src="/about-shop.jpg" alt="The UNIK TRENDS shop at Tejuosho Plaza" /></div>
        <div>
          <p className="eyebrow text-accent">Where we are</p>
          <h2 className="mt-2 text-3xl md:text-4xl">Our shop and production</h2>
          <p className="mt-3 text-muted-foreground">Everything is made and sold from {SHOP_ADDRESS}. Visit to see the fabrics, try the fits, and pay and collect your booking.</p>
          {settings.openingHours && <p className="mt-3 text-sm font-bold">Open: {settings.openingHours}</p>}
        </div>
      </section>

      <section className="mt-14 grid items-center gap-8 md:grid-cols-2">
        <div className="md:order-2 border-2 border-primary shadow-block"><Photo src="/about-owner.jpg" alt="The maker behind UNIK TRENDS" /></div>
        <div>
          <p className="eyebrow text-accent">Who makes it</p>
          <h2 className="mt-2 text-3xl md:text-4xl">Made by the UNIK TRENDS team</h2>
          <p className="mt-3 text-muted-foreground">Every piece is cut, sewn and checked by our own team, so you deal directly with the people who make the clothes.</p>
        </div>
      </section>

      <div className="mt-14 border-2 border-primary shadow-block">
        <iframe title="UNIK TRENDS shop location" className="h-80 w-full" loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/shop" className="btn btn-accent">Shop wholesale</Link><Link href="/contact" className="btn btn-ghost">Contact us</Link></div>
    </div>
  );
}
