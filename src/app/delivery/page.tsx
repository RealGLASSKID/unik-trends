"use client";
import Link from "next/link";
import { useApp } from "@/lib/app";

const STEPS = [["Pick your pieces", "Choose sizes and colours and meet the minimum order quantity."], ["Place the order", "Log in, check out and WhatsApp opens with your order."], ["Pay or negotiate", "Agree the price and pay the owner on WhatsApp."], ["Receive or collect", "We send by waybill, or you collect in person."]];
export default function Delivery() {
  const { settings } = useApp();
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-5xl md:text-7xl">Delivery &amp; pick-up</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">Waybill to any state, pick-up in person, or another arrangement. Waybill fees are paid by the customer on pickup.</p>
      <ol className="mt-10 grid gap-5 md:grid-cols-4">{STEPS.map(([t, b], i) => <li key={t} className="border-2 border-primary p-6"><span className="font-display text-4xl text-accent">{i + 1}</span><h3 className="mt-3 text-lg leading-tight">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{b}</p></li>)}</ol>
      <div className="mt-10 border-2 border-primary bg-secondary p-6"><p className="whitespace-pre-line text-sm text-muted-foreground">{settings.deliveryInfo}</p></div>
      <Link href="/shop" className="btn mt-8">Start your order</Link>
    </div>
  );
}
