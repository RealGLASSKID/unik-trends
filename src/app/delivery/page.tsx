"use client";
import Link from "next/link";
import { useApp } from "@/lib/app";

const OPTIONS = [
  {
    title: "Waybill (nationwide)",
    body: "We send to any state through trusted park and logistics partners. Waybill fee is added at checkout and paid with your order.",
  },
  {
    title: "Dispatch rider (Lagos area)",
    body: "For deliveries inside Lagos. A dispatch rider can bring your order to your address. Rider availability and fee are confirmed with the shop when your order is processed.",
  },
  {
    title: "Pick-up in person",
    body: "Collect at Tejuosho Plaza, Yaba after your booking or paid order is confirmed. Pay at the shop if you booked.",
  },
];

export default function Delivery() {
  const { settings } = useApp();
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-5xl md:text-7xl">Delivery &amp; pick-up</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Choose waybill, Lagos dispatch, or collect in person when you order online. Bookings are
        always pick-up at the shop.
      </p>
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {OPTIONS.map((o) => (
          <li key={o.title} className="border-2 border-primary p-6 shadow-block">
            <h2 className="text-xl leading-tight">{o.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{o.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 border-2 border-primary bg-secondary p-6">
        <p className="whitespace-pre-line text-sm text-muted-foreground">{settings.deliveryInfo}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Note: Own shop riders may be added later. For now, Lagos dispatch is arranged when your
          order is confirmed.
        </p>
      </div>
      <Link href="/shop" className="btn mt-8">
        Start your order
      </Link>
    </div>
  );
}
