"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DELIVERY,
  NIGERIA_STATES,
  PAYSTACK_PUBLIC_KEY,
  fmt,
  openPaystack,
  useApp,
  type OrderType,
} from "@/lib/app";
import { CreditCard, Lock, MapPin, Store, Truck } from "lucide-react";

type Step = "details" | "pay";

export default function Checkout() {
  const { user, authLoading, isAdmin, items, currency, total, clear, settings } = useApp();
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType>("order");
  const [step, setStep] = useState<Step>("details");
  const [f, setF] = useState({
    name: "",
    phone: "",
    delivery: DELIVERY[0]!,
    state: "Lagos",
    address: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !f.name) setF((x) => ({ ...x, name: user.displayName ?? "" }));
  }, [user]); // eslint-disable-line
  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth?next=/checkout");
  }, [authLoading, user, router]);

  const isWaybill = orderType === "order" && f.delivery === "Waybill";
  const isDispatch = orderType === "order" && f.delivery.startsWith("Dispatch");
  const waybillFee = isWaybill ? settings.waybillFeeNgn || 0 : 0;
  const subtotalNgn = total("NGN");
  const grandNgn = subtotalNgn + waybillFee;
  const grandUsd =
    total("USD") + (waybillFee > 0 ? waybillFee / (settings.rate || 1500) : 0);
  const paystackReady = Boolean(PAYSTACK_PUBLIC_KEY);

  if (!items.length && step === "details")
    return (
      <div className="px-4 py-24 text-center">
        <h1 className="text-5xl">Nothing to check out</h1>
        <Link href="/shop" className="btn mt-8">Go shopping</Link>
      </div>
    );
  if (!user)
    return <div className="px-4 py-24 text-center">Redirecting to login…</div>;
  if (isAdmin)
    return (
      <div className="px-4 py-24 text-center">
        <h1 className="text-4xl">Admin cannot checkout</h1>
        <p className="mt-3 text-muted-foreground">Only customer accounts can place bookings or orders.</p>
        <Link href="/admin" className="btn mt-6">Open admin</Link>
      </div>
    );

  const saveProfile = async () => {
    await setDoc(
      doc(db, "users", user.uid),
      {
        name: f.name,
        phone: f.phone,
        email: user.email ?? "",
        delivery: f.delivery,
        address: f.address,
        state: f.state,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  };

  const deliveryLabel =
    orderType === "booking"
      ? "Pick-up in person (booked)"
      : isWaybill
        ? `Waybill · ${f.state}`
        : isDispatch
          ? "Dispatch rider (Lagos area)"
          : "Pick-up in person";

  const buildPayload = (extra: Record<string, unknown>) => ({
    userId: user.uid,
    customerName: f.name,
    phone: f.phone,
    email: user.email ?? "",
    delivery: deliveryLabel,
    address:
      orderType === "booking"
        ? settings.shopAddress || "Tejuosho Plaza, Yaba, Lagos"
        : isWaybill
          ? `${f.address}${f.state ? `, ${f.state}` : ""}`
          : settings.shopAddress || f.address,
    state: isWaybill ? f.state : "Lagos",
    notes: f.notes,
    items: items.map(({ name, size, color, qty, priceNgn, priceUsd }) => ({
      name, size, color, qty, priceNgn, priceUsd,
    })),
    subtotalNgn,
    waybillFeeNgn: waybillFee,
    totalNgn: grandNgn,
    totalUsd: Math.round(grandUsd * 100) / 100,
    currency,
    createdAt: Date.now(),
    readByAdmin: false,
    statusNote: "",
    ...extra,
  });

  const submitBooking = async () => {
    setBusy(true);
    setErr("");
    try {
      if (!f.name.trim() || !f.phone.trim()) {
        setErr("Name and phone are required.");
        setBusy(false);
        return;
      }
      const ref = await addDoc(
        collection(db, "orders"),
        buildPayload({
          orderType: "booking",
          paymentMethod: "pay_at_shop",
          paymentStatus: "unpaid",
          status: "Booked",
        })
      );
      await saveProfile();
      clear();
      router.push(`/cart?booked=${ref.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  /** Step 1 for online order: validate + create unpaid order, then show payment UI */
  const goToPayment = async () => {
    setBusy(true);
    setErr("");
    try {
      if (!f.name.trim() || !f.phone.trim()) {
        setErr("Name and phone are required.");
        setBusy(false);
        return;
      }
      if (isWaybill && !f.address.trim()) {
        setErr("Enter your waybill terminal / address.");
        setBusy(false);
        return;
      }
      if (isWaybill && !f.state) {
        setErr("Select a destination state.");
        setBusy(false);
        return;
      }
      if (isDispatch && !f.address.trim()) {
        setErr("Enter your Lagos delivery address for the dispatch rider.");
        setBusy(false);
        return;
      }
      const ref = await addDoc(
        collection(db, "orders"),
        buildPayload({
          orderType: "order",
          paymentMethod: paystackReady ? "paystack" : "paystack_demo",
          paymentStatus: "unpaid",
          status: "Pending",
        })
      );
      await saveProfile();
      setOrderId(ref.id);
      setStep("pay");
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const markPaid = async (refId: string, payRef: string) => {
    await updateDoc(doc(db, "orders", refId), {
      paymentStatus: "paid",
      status: "Confirmed/Paid",
      paystackReference: payRef,
      paidAt: Date.now(),
    });
    clear();
    router.push(`/cart?ordered=${refId}&paid=1`);
  };

  const payWithPaystack = async () => {
    if (!orderId) return;
    setBusy(true);
    setErr("");
    try {
      if (paystackReady) {
        const reference = `unik_${orderId}_${Date.now()}`;
        await openPaystack({
          email: user.email || `${f.phone}@unik-trends.customer`,
          amountNgn: grandNgn,
          reference,
          metadata: {
            orderId,
            custom_fields: [
              { display_name: "Order", variable_name: "order_id", value: orderId },
              { display_name: "Phone", variable_name: "phone", value: f.phone },
            ],
          },
          onSuccess: async (payRef) => {
            try {
              await markPaid(orderId, payRef);
            } catch (e) {
              setErr((e as Error).message);
              setBusy(false);
            }
          },
          onClose: () => {
            setBusy(false);
            setErr("Payment window closed. Complete payment to place your order.");
          },
        });
        return;
      }
      // Demo Paystack UI path when key is not set
      await markPaid(orderId, `demo_${orderId}_${Date.now()}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const onSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderType === "booking") submitBooking();
    else goToPayment();
  };

  // ——— Payment step (Paystack UI) ———
  if (step === "pay" && orderId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-4xl md:text-5xl">Payment</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete payment to place your order. Bookings do not use this step.
        </p>

        <div className="mt-8 border-2 border-primary bg-card p-6 shadow-block">
          <div className="flex items-center gap-3 border-b-2 border-border pb-4">
            <span className="grid h-12 w-12 place-items-center bg-[#0BA4DB] text-white">
              <CreditCard className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold">Paystack</p>
              <p className="text-xs text-muted-foreground">
                {paystackReady ? "Secure card, bank & USSD" : "Payment UI ready — live key not set yet"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span>#{orderId.slice(0, 8)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotalNgn, "NGN")}</span></div>
            {waybillFee > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Waybill ({f.state})</span><span>{fmt(waybillFee, "NGN")}</span></div>
            )}
            <div className="flex justify-between border-t-2 border-border pt-2 text-lg font-bold">
              <span>Total</span><span>{fmt(grandNgn, "NGN")}</span>
            </div>
          </div>

          {!paystackReady && (
            <p className="mt-4 border-2 border-accent/40 bg-accent/10 p-3 text-xs text-muted-foreground">
              Paystack public key is not in <code className="text-foreground">.env.local</code> yet.
              This screen is the payment step. When the owner adds{" "}
              <code className="text-foreground">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code>, the real
              Paystack popup opens automatically. Demo button below marks the order paid for testing.
            </p>
          )}

          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

          <button
            type="button"
            className="btn btn-accent mt-6 w-full"
            disabled={busy}
            onClick={payWithPaystack}
          >
            <Lock className="h-4 w-4" />
            {busy
              ? "Processing…"
              : paystackReady
                ? `Pay ${fmt(grandNgn, "NGN")}`
                : `Pay ${fmt(grandNgn, "NGN")} (demo)`}
          </button>
          <button
            type="button"
            className="btn btn-ghost mt-3 w-full"
            disabled={busy}
            onClick={() => {
              setStep("details");
              setErr("Order saved as unpaid. Complete payment to confirm it.");
            }}
          >
            Back to details
          </button>
          <p className="mt-4 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Secured by Paystack · Order not confirmed until paid
          </p>
        </div>
      </div>
    );
  }

  // ——— Details step ———
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmitDetails} className="grid gap-4">
        <h1 className="text-5xl">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Book for shop pick-up (pay at Tejuosho), or order online and pay before the order is confirmed.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setOrderType("booking")}
            className={`border-2 p-4 text-left transition ${
              orderType === "booking" ? "border-accent bg-accent/10" : "border-primary"
            }`}
          >
            <Store className="mb-2 h-6 w-6" />
            <span className="font-display text-lg">Book & pick up</span>
            <p className="mt-1 text-xs text-muted-foreground">
              No online payment. Reserve items, pay at the Lagos shop, collect.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setOrderType("order")}
            className={`border-2 p-4 text-left transition ${
              orderType === "order" ? "border-accent bg-accent/10" : "border-primary"
            }`}
          >
            <Truck className="mb-2 h-6 w-6" />
            <span className="font-display text-lg">Order online</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Pay with Paystack first, then waybill or pick-up.
            </p>
          </button>
        </div>

        <input
          className="field"
          placeholder="Full name"
          required
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <input
          className="field"
          placeholder="Phone / WhatsApp number"
          required
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />

        {orderType === "order" && (
          <>
            <label className="grid gap-1 text-xs font-bold uppercase">
              Delivery
              <select
                className="field"
                value={f.delivery}
                onChange={(e) => setF({ ...f, delivery: e.target.value })}
              >
                {DELIVERY.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            {isWaybill && (
              <>
                <div className="border-2 border-accent bg-accent/10 p-3 text-xs">
                  <Truck className="mb-1 inline h-4 w-4" /> Waybill fee:{" "}
                  <b>{fmt(settings.waybillFeeNgn || 0, "NGN")}</b> — added to total and paid with the order.
                </div>
                <label className="grid gap-1 text-xs font-bold uppercase">
                  Destination state
                  <select
                    className="field"
                    required
                    value={f.state}
                    onChange={(e) => setF({ ...f, state: e.target.value })}
                  >
                    {NIGERIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <input
                  className="field"
                  placeholder="Address / waybill terminal and park"
                  required
                  value={f.address}
                  onChange={(e) => setF({ ...f, address: e.target.value })}
                />
              </>
            )}

            {isDispatch && (
              <>
                <div className="border-2 border-accent bg-accent/10 p-3 text-xs">
                  Dispatch rider is for <b>Lagos area</b>. Fee is confirmed with the shop when processing your order (owner riders may apply).
                </div>
                <input
                  className="field"
                  placeholder="Lagos delivery address"
                  required
                  value={f.address}
                  onChange={(e) => setF({ ...f, address: e.target.value })}
                />
              </>
            )}
            {!isWaybill && !isDispatch && (
              <p className="flex items-start gap-2 border-2 border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                Collect at Tejuosho Plaza, Yaba, Lagos after payment is confirmed.
              </p>
            )}
          </>
        )}

        {orderType === "booking" && (
          <p className="flex items-start gap-2 border-2 border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            You will pay at the shop when you collect. No online payment for bookings.
          </p>
        )}

        <textarea
          className="field"
          rows={3}
          placeholder="Notes (optional)"
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
        />

        {err && <p className="text-sm text-destructive">{err}</p>}

        <button className="btn btn-accent" disabled={busy}>
          {busy
            ? "Please wait…"
            : orderType === "booking"
              ? "Confirm booking"
              : `Continue to payment · ${fmt(grandNgn, "NGN")}`}
        </button>
      </form>

      <aside className="h-fit border-2 border-primary p-5 shadow-block">
        <h2 className="font-display text-xl">Summary</h2>
        <ul className="mt-4 grid gap-2 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex justify-between gap-2">
              <span>
                {i.qty}× {i.name}
                <span className="text-muted-foreground">
                  {" "}({[i.size, i.color].filter(Boolean).join(", ")})
                </span>
              </span>
              <span className="shrink-0 font-bold">
                {fmt(currency === "NGN" ? i.priceNgn * i.qty : i.priceUsd * i.qty, currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-1 border-t-2 border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{fmt(subtotalNgn, "NGN")}</span>
          </div>
          {waybillFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Waybill fee</span>
              <span>{fmt(waybillFee, "NGN")}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{fmt(grandNgn, "NGN")}</span>
          </div>
          {currency === "USD" && (
            <p className="text-xs text-muted-foreground">≈ {fmt(grandUsd, "USD")}</p>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {orderType === "booking"
            ? "No online payment — pay at the shop."
            : "Online orders require payment before confirmation."}
        </p>
      </aside>
    </div>
  );
}
