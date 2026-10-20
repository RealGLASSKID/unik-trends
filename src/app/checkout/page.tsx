"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DELIVERY,
  PAYSTACK_PUBLIC_KEY,
  fmt,
  openPaystack,
  useApp,
  waLink,
  type OrderType,
  type PaymentMethod,
} from "@/lib/app";
import { MapPin, Package, Store, Truck } from "lucide-react";

export default function Checkout() {
  const { user, authLoading, items, currency, total, clear, settings } = useApp();
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType>("order");
  const [f, setF] = useState({
    name: "",
    phone: "",
    delivery: DELIVERY[0]!,
    address: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user && !f.name) setF((x) => ({ ...x, name: user.displayName ?? "" }));
  }, [user]); // eslint-disable-line
  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth?next=/checkout");
  }, [authLoading, user, router]);

  const isWaybill = orderType === "order" && f.delivery === DELIVERY[0];
  const waybillFee = isWaybill ? settings.waybillFeeNgn || 0 : 0;
  const subtotalNgn = total("NGN");
  const grandNgn = subtotalNgn + waybillFee;
  const grandUsd =
    total("USD") + (waybillFee > 0 ? waybillFee / (settings.rate || 1500) : 0);

  const paystackReady = Boolean(PAYSTACK_PUBLIC_KEY);

  const summaryLines = useMemo(
    () =>
      items.map(
        (i) =>
          `• ${i.qty}× ${i.name} (${[i.size, i.color].filter(Boolean).join(", ")})`
      ),
    [items]
  );

  if (!items.length)
    return (
      <div className="px-4 py-24 text-center">
        <h1 className="text-5xl">Nothing to check out</h1>
        <Link href="/shop" className="btn mt-8">
          Go shopping
        </Link>
      </div>
    );
  if (!user)
    return <div className="px-4 py-24 text-center">Redirecting to login…</div>;

  const saveProfile = async () => {
    await setDoc(
      doc(db, "users", user.uid),
      {
        name: f.name,
        phone: f.phone,
        email: user.email ?? "",
        delivery: f.delivery,
        address: f.address,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  };

  const buildOrderPayload = (extra: {
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    paymentStatus: "unpaid" | "paid";
    status: string;
    paystackReference?: string;
    paidAt?: number;
  }) => ({
    userId: user.uid,
    customerName: f.name,
    phone: f.phone,
    email: user.email ?? "",
    delivery: orderType === "booking" ? "Pick-up in person (booked)" : f.delivery,
    address: orderType === "booking" ? settings.shopAddress || f.address : f.address,
    notes: f.notes,
    items: items.map(({ name, size, color, qty, priceNgn, priceUsd }) => ({
      name,
      size,
      color,
      qty,
      priceNgn,
      priceUsd,
    })),
    subtotalNgn,
    waybillFeeNgn: waybillFee,
    totalNgn: grandNgn,
    totalUsd: Math.round(grandUsd * 100) / 100,
    currency,
    createdAt: Date.now(),
    readByAdmin: false,
    ...extra,
  });

  const afterSuccess = (orderId: string, type: OrderType) => {
    clear();
    if (type === "booking") {
      const text = `Hi UNIK TRENDS, I booked order #${orderId.slice(0, 6)} for pick-up.\n\n${summaryLines.join("\n")}\n\nTotal: ${fmt(subtotalNgn, "NGN")}\nName: ${f.name}\nPhone: ${f.phone}\n\nI'll come to the shop to pay and collect.`;
      window.open(waLink(settings.whatsapp, text), "_blank");
    }
    router.push(`/account?placed=${orderId}`);
  };

  const submitBooking = async () => {
    setBusy(true);
    setErr("");
    try {
      const ref = await addDoc(
        collection(db, "orders"),
        buildOrderPayload({
          orderType: "booking",
          paymentMethod: "pay_at_shop",
          paymentStatus: "unpaid",
          status: "Booked",
        })
      );
      await saveProfile();
      afterSuccess(ref.id, "booking");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const submitOrder = async () => {
    setBusy(true);
    setErr("");
    try {
      if (isWaybill && !f.address.trim()) {
        setErr("Please enter your waybill terminal / address and state.");
        setBusy(false);
        return;
      }

      // Create order first (unpaid). Paystack callback marks it paid.
      const ref = await addDoc(
        collection(db, "orders"),
        buildOrderPayload({
          orderType: "order",
          paymentMethod: paystackReady ? "paystack" : "whatsapp",
          paymentStatus: "unpaid",
          status: "Pending",
        })
      );
      await saveProfile();

      if (paystackReady) {
        const reference = `unik_${ref.id}_${Date.now()}`;
        await openPaystack({
          email: user.email || `${f.phone}@unik-trends.customer`,
          amountNgn: grandNgn,
          reference,
          metadata: {
            orderId: ref.id,
            custom_fields: [
              { display_name: "Order", variable_name: "order_id", value: ref.id },
              { display_name: "Phone", variable_name: "phone", value: f.phone },
            ],
          },
          onSuccess: async (payRef) => {
            try {
              await updateDoc(doc(db, "orders", ref.id), {
                paymentStatus: "paid",
                status: "Confirmed/Paid",
                paystackReference: payRef,
                paidAt: Date.now(),
              });
            } catch {}
            clear();
            router.push(`/account?placed=${ref.id}&paid=1`);
          },
          onClose: () => {
            setBusy(false);
            setErr(
              "Payment window closed. Your order is saved as Pending — you can pay later or chat on WhatsApp."
            );
            // Keep cart? User might retry. Leave order in Pending.
            router.push(`/account?placed=${ref.id}`);
          },
        });
        return;
      }

      // No Paystack key yet — WhatsApp fallback
      const text = `Hi UNIK TRENDS, I placed order #${ref.id.slice(0, 6)}.\n\n${summaryLines.join("\n")}\n\nSubtotal: ${fmt(subtotalNgn, "NGN")}${waybillFee ? `\nWaybill fee: ${fmt(waybillFee, "NGN")}` : ""}\nTotal: ${fmt(grandNgn, "NGN")}\nName: ${f.name}\nPhone: ${f.phone}\nDelivery: ${f.delivery}${f.address ? `\nAddress: ${f.address}` : ""}${f.notes ? `\nNotes: ${f.notes}` : ""}\n\nPlease send payment details.`;
      clear();
      window.open(waLink(settings.whatsapp, text), "_blank");
      router.push(`/account?placed=${ref.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderType === "booking") submitBooking();
    else submitOrder();
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} className="grid gap-4">
        <h1 className="text-5xl">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Choose how you want to get your items — book for shop pick-up, or order online with
          delivery.
        </p>

        {/* Order type */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setOrderType("booking")}
            className={`flex flex-col items-start gap-2 border-2 p-4 text-left transition ${
              orderType === "booking"
                ? "border-accent bg-accent/10 shadow-block"
                : "border-primary"
            }`}
          >
            <Store className="h-6 w-6" />
            <span className="font-display text-lg">Book & pick up</span>
            <span className="text-xs text-muted-foreground">
              Reserve your items. Come to our Lagos shop, pay there, and take them home.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOrderType("order")}
            className={`flex flex-col items-start gap-2 border-2 p-4 text-left transition ${
              orderType === "order"
                ? "border-accent bg-accent/10 shadow-block"
                : "border-primary"
            }`}
          >
            <Package className="h-6 w-6" />
            <span className="font-display text-lg">Order online</span>
            <span className="text-xs text-muted-foreground">
              Pay{paystackReady ? " with Paystack" : " (Paystack activates when key is set)"} and
              choose waybill or pick-up.
            </span>
          </button>
        </div>

        <input
          className="field"
          placeholder="Full name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          required
        />
        <input
          className="field"
          placeholder="Phone / WhatsApp number"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
          required
        />

        {orderType === "booking" ? (
          <div className="border-2 border-primary bg-muted/40 p-4 text-sm">
            <p className="flex items-start gap-2 font-bold">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              Shop pick-up
            </p>
            <p className="mt-2 text-muted-foreground">
              {settings.shopAddress ||
                "We'll confirm the Lagos workshop address on WhatsApp after you book."}
            </p>
            <p className="mt-2 text-muted-foreground">
              Pay in cash or transfer when you arrive. Your booking holds the stock for you.
            </p>
          </div>
        ) : (
          <>
            <label className="grid gap-1 text-xs font-bold uppercase">
              Delivery
              <select
                className="field"
                value={f.delivery}
                onChange={(e) => setF({ ...f, delivery: e.target.value })}
              >
                {DELIVERY.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            {isWaybill && (
              <div className="flex items-start gap-2 border-2 border-accent bg-accent/10 p-3 text-sm">
                <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold">
                    Waybill fee: {fmt(settings.waybillFeeNgn || 0, "NGN")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Added to your total and paid with the order
                    {paystackReady ? " via Paystack" : ""}. Admin can change this fee in Settings.
                  </p>
                </div>
              </div>
            )}
            <input
              className="field"
              placeholder={
                f.delivery === DELIVERY[1]
                  ? "Pick-up notes (optional)"
                  : "Address / waybill terminal and state"
              }
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
              required={isWaybill}
            />
          </>
        )}

        <textarea
          className="field"
          rows={3}
          placeholder="Notes (optional)"
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
        />

        {orderType === "order" && !paystackReady && (
          <p className="border-2 border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            Online Paystack payment is not active yet (key not in env). Your order will still be
            created and WhatsApp will open so you can complete payment with the owner.
          </p>
        )}

        {err && <p className="text-sm text-destructive">{err}</p>}

        <button className="btn btn-accent" disabled={busy}>
          {busy
            ? "Working…"
            : orderType === "booking"
              ? "Book for pick-up"
              : paystackReady
                ? `Pay ${fmt(grandNgn, "NGN")} with Paystack`
                : "Place order & chat on WhatsApp"}
        </button>
      </form>

      <aside className="h-fit border-2 border-primary p-6 shadow-block">
        <h2 className="text-2xl">Summary</h2>
        <ul className="mt-3 grid gap-1 text-sm">
          {items.map((i) => (
            <li key={i.key}>
              {i.qty}× {i.name}{" "}
              <span className="text-muted-foreground">
                ({[i.size, i.color].filter(Boolean).join(", ")})
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t-2 border-border pt-3 text-sm">
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
          <p className="text-xs text-muted-foreground">{fmt(grandUsd, "USD")}</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {orderType === "booking"
            ? "Payment at the shop when you collect."
            : paystackReady
              ? "Secure card / transfer via Paystack."
              : "Payment arranged on WhatsApp until Paystack is enabled."}
        </p>
      </aside>
    </div>
  );
}
