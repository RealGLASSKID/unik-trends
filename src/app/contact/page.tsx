"use client";
import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { MessageCircle, MapPin, Phone } from "lucide-react";
import { db } from "@/lib/firebase";
import { useApp, waLink } from "@/lib/app";

export default function ContactPage() {
  const { settings } = useApp();
  const [f, setF] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await addDoc(collection(db, "messages"), {
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        message: f.message.trim(),
        createdAt: Date.now(),
        read: false,
        status: "new",
      });
      setDone(true);
      setF({ name: "", email: "", phone: "", message: "" });
    } catch (e) {
      setErr((e as Error).message || "Could not send. Try again.");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-5xl">Contact</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Ordering needs no chat: pick your pieces and order or book online. Contact us only when you need something the website can not do.
        Messages go straight to our admin dashboard and we reply within 48 hours.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="border-2 border-primary p-5"><h2 className="text-xl">Send a message for</h2>
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground"><li>• Bulk or very large orders and special quantities</li><li>• Custom colours, sizes or your own designs</li><li>• Booking a visit to our shop in Tejuosho</li><li>• Help with an order you already placed</li><li>• Delivery arrangements other than waybill or pick-up</li></ul></div>
        <div className="border-2 border-primary p-5"><h2 className="text-xl">Use WhatsApp for</h2>
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground"><li>• Quick questions, like whether a size or colour is in stock</li><li>• Sending a photo of the item you are asking about</li><li>• Checking where your order or waybill is</li></ul>
          <p className="mt-3 text-xs font-bold uppercase">We reply within 48 hours. Prices are fixed on the website, so there is no need to negotiate.</p></div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          {done ? (
            <div className="border-2 border-primary bg-muted/40 p-8 shadow-block">
              <h2 className="text-2xl">Message sent</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Thanks — our team will reply by email or phone as soon as possible.
              </p>
              <button type="button" className="btn mt-6" onClick={() => setDone(false)}>
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3 border-2 border-primary p-6 shadow-block">
              <h2 className="text-2xl">Send a message</h2>
              <input
                className="field"
                placeholder="Your name"
                required
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
              <input
                className="field"
                type="email"
                placeholder="Email"
                required
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
              <input
                className="field"
                placeholder="Phone / WhatsApp"
                required
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
              <textarea
                className="field"
                rows={5}
                placeholder="How can we help? (sizes, bulk order, visit, etc.)"
                required
                value={f.message}
                onChange={(e) => setF({ ...f, message: e.target.value })}
              />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button className="btn btn-accent" disabled={busy}>
                {busy ? "Sending…" : "Send to UNIK TRENDS"}
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={waLink(
                settings.whatsapp,
                "Hi UNIK TRENDS, I have a quick question."
              )}
              target="_blank"
              rel="noreferrer"
              className="btn btn-wa"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp us
            </a>
            {settings.whatsapp && (
              <a
                href={`tel:+${settings.whatsapp.replace(/\D/g, "")}`}
                className="btn btn-ghost"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="border-2 border-primary p-6">
            <h2 className="flex items-center gap-2 text-2xl">
              <MapPin className="h-5 w-5 text-accent" /> Visit the shop
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              <b className="text-foreground">Tejuosho (Tejuoso) Market Plaza</b>
              <br />
              Yaba, Lagos, Nigeria
              <br />
              Production &amp; pick-up for bookings
            </p>
            {settings.shopAddress && (
              <p className="mt-2 text-sm text-muted-foreground">{settings.shopAddress}</p>
            )}
          </div>
          <div className="overflow-hidden border-2 border-primary">
            <iframe
              title="Tejuosho Plaza Yaba Lagos map"
              src="https://maps.google.com/maps?q=Tejuosho%20Market%20Yaba%20Lagos&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
