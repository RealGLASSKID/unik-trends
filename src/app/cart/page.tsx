"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Bell, Minus, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  STATUSES_USER_FRIENDLY,
  fmt,
  useApp,
  type Order,
} from "@/lib/app";

export default function CartPage() {
  const { user, items, setQty, remove, total, currency, count } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [banner, setBanner] = useState("");
  const [statusAlerts, setStatusAlerts] = useState<string[]>([]);

  useEffect(() => {
    const s = new URLSearchParams(location.search);
    if (s.get("booked")) setBanner("Booking saved. Track it below — pay when you collect at Tejuosho.");
    if (s.get("ordered"))
      setBanner(
        s.get("paid")
          ? "Payment successful. Your order is confirmed — track status below."
          : "Order recorded. Complete payment if it is still pending."
      );
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Order)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list);
      // status tips for non-final orders
      const tips = list
        .filter((o) => !["Delivered", "Cancelled"].includes(o.status))
        .slice(0, 5)
        .map((o) => {
          const label = STATUSES_USER_FRIENDLY[o.status] || o.status;
          return `#${o.id.slice(0, 6)} · ${o.orderType === "booking" ? "Booking" : "Order"} · ${label}`;
        });
      setStatusAlerts(tips);
    });
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-5xl md:text-6xl">Cart &amp; orders</h1>
      {banner && (
        <p className="mt-4 border-2 border-accent bg-accent/10 p-4 text-sm font-bold">{banner}</p>
      )}

      {/* Live status notifications */}
      {user && statusAlerts.length > 0 && (
        <div className="mt-6 border-2 border-primary bg-muted/30 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <Bell className="h-4 w-4 text-accent" /> Your order updates
          </p>
          <ul className="mt-2 grid gap-1 text-sm">
            {statusAlerts.map((t) => (
              <li key={t} className="text-muted-foreground">• {t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Active cart */}
      <section className="mt-10">
        <h2 className="text-2xl">Shopping cart {count > 0 && `(${count})`}</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            Cart is empty.{" "}
            <Link href="/shop" className="underline">Browse shop</Link>
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y-2 divide-border border-2 border-primary">
              {items.map((i) => (
                <li key={i.key} className="flex flex-wrap items-center gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image || "/logo.png"} alt="" className="h-20 w-16 bg-muted object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[i.size, i.color].filter(Boolean).join(" · ")} · MOQ {i.minQty}
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {fmt(currency === "NGN" ? i.priceNgn : i.priceUsd, currency)} each
                    </p>
                  </div>
                  <div className="flex items-center border-2 border-primary">
                    <button
                      type="button"
                      className="p-2"
                      aria-label="Decrease"
                      onClick={() => setQty(i.key, Math.max(i.minQty, i.qty - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-bold">{i.qty}</span>
                    <button
                      type="button"
                      className="p-2"
                      aria-label="Increase"
                      onClick={() => setQty(i.key, i.qty + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="p-2 text-destructive"
                    aria-label="Remove"
                    onClick={() => remove(i.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xl font-bold">Total {fmt(total(currency), currency)}</p>
              <Link href="/checkout" className="btn btn-accent">
                Checkout
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Bookings & orders history with live status */}
      <section className="mt-14">
        <h2 className="text-2xl">My bookings &amp; orders</h2>
        {!user ? (
          <p className="mt-3 text-muted-foreground">
            <Link href="/auth?next=/cart" className="underline">Log in</Link> to see bookings and order status here.
          </p>
        ) : orders.length === 0 ? (
          <p className="mt-3 text-muted-foreground">No bookings or orders yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {orders.map((o) => (
              <li key={o.id} className="border-2 border-primary p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""} · #
                      {o.id.slice(0, 8)} ·{" "}
                      <b className="text-foreground">
                        {o.orderType === "booking" ? "Booking" : "Order"}
                      </b>
                    </p>
                    <p className="mt-2 text-sm">
                      {o.items
                        ?.map(
                          (i) =>
                            `${i.qty}× ${i.name} (${[i.size, i.color].filter(Boolean).join(", ")})`
                        )
                        .join("; ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.delivery}
                      {o.paymentStatus === "paid" ? " · Paid" : " · Unpaid"}
                      {o.waybillFeeNgn ? ` · Waybill ${fmt(o.waybillFeeNgn, "NGN")}` : ""}
                    </p>
                  </div>
                  <span className="chip on shrink-0">{o.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {STATUSES_USER_FRIENDLY[o.status] || o.status}
                </p>
                {o.statusNote && (
                  <p className="mt-2 border-l-4 border-accent bg-accent/10 px-3 py-2 text-sm">
                    Admin note: {o.statusNote}
                  </p>
                )}
                <p className="mt-2 font-bold">
                  {fmt(
                    o.currency === "USD" ? o.totalUsd : o.totalNgn,
                    o.currency === "USD" ? "USD" : "NGN"
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
