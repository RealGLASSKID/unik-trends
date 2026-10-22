"use client";
import Link from "next/link";
import { useApp } from "@/lib/app";

export default function About() {
  const { settings } = useApp();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-5xl md:text-7xl">About us</h1>
      <p className="mt-6 leading-relaxed text-muted-foreground">
        UNIK TRENDS is a Nigerian clothing manufacturer making baggy jeans, hoodies and streetwear
        for men and women. We sell at wholesale prices so resellers can buy in bulk and resell at
        retail.
      </p>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Production and pick-up are at <b className="text-foreground">Tejuosho Plaza, Yaba, Lagos</b>.
        Online you can book for shop collection or order for waybill — no long chat needed to place
        an order.
      </p>
      {settings.shopAddress && (
        <p className="mt-4 text-sm text-muted-foreground">{settings.shopAddress}</p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop" className="btn btn-accent">
          Shop wholesale
        </Link>
        <Link href="/contact" className="btn btn-ghost">
          Contact &amp; map
        </Link>
      </div>
    </div>
  );
}
