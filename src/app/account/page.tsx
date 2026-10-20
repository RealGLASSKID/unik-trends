"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { fmt, useApp, type Order } from "@/lib/app";

export type { Order };

export default function Account() {
  const { user, authLoading, isAdmin } = useApp();
  const [f, setF] = useState({ name: "", phone: "", delivery: "", address: "" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [saved, setSaved] = useState(false);
  const [placedMsg, setPlacedMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("placed")) {
      setPlacedMsg(
        params.get("paid")
          ? "Payment received. Your order is confirmed."
          : "Order / booking received. Track status below."
      );
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((s) => {
      const d = s.data();
      if (d)
        setF({
          name: d.name ?? "",
          phone: d.phone ?? "",
          delivery: d.delivery ?? "",
          address: d.address ?? "",
        });
    });
    return onSnapshot(
      query(collection(db, "orders"), where("userId", "==", user.uid)),
      (s) =>
        setOrders(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Order)
            .sort((a, b) => b.createdAt - a.createdAt)
        )
    );
  }, [user]);

  if (authLoading) return <div className="px-4 py-20 text-center">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-5xl">My account</h1>
        <p className="mt-3 text-muted-foreground">
          Log in to see your orders and saved details.
        </p>
        <Link href="/auth" className="btn mt-6">
          Log in or sign up
        </Link>
      </div>
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, "users", user.uid), { ...f, email: user.email ?? "" }, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[320px_1fr]">
      <form onSubmit={save} className="grid h-fit gap-3 border-2 border-primary p-6 shadow-block">
        <h2 className="text-2xl">My details</h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <input
          className="field"
          placeholder="Full name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <input
          className="field"
          placeholder="Phone / WhatsApp"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
        <input
          className="field"
          placeholder="Delivery address or waybill terminal"
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
        />
        <button className="btn">{saved ? "Saved" : "Save details"}</button>
        {isAdmin && (
          <Link href="/admin" className="btn btn-accent">
            Open admin dashboard
          </Link>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => signOut(auth)}>
          Log out
        </button>
      </form>
      <div>
        <h1 className="text-4xl">My orders</h1>
        {placedMsg && (
          <p className="mt-3 border-2 border-accent bg-accent/10 p-3 text-sm font-bold">
            {placedMsg}
          </p>
        )}
        {orders.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No orders yet.{" "}
            <Link href="/shop" className="underline">
              Start shopping
            </Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {orders.map((o) => (
              <li key={o.id} className="border-2 border-primary p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString()} · #{o.id.slice(0, 6)} ·{" "}
                    {o.orderType === "booking" ? "Booking" : "Order"}
                  </span>
                  <span className="chip on">{o.status}</span>
                </div>
                <p className="mt-2 text-sm">
                  {o.items
                    .map(
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
                <p className="mt-2 font-bold">
                  {fmt(o.currency === "NGN" ? o.totalNgn : o.totalUsd, o.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
