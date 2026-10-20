"use client";
import { MessageCircle } from "lucide-react";
import { useApp, waLink } from "@/lib/app";

export default function Contact() {
  const { settings } = useApp();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-5xl md:text-7xl">Contact</h1>
      <p className="mt-6 text-muted-foreground">The fastest way to reach us is WhatsApp. Ask about prices, bulk orders, delivery or negotiate directly with the owner.</p>
      <a href={waLink(settings.whatsapp, "Hi UNIK TRENDS, I'd like to make an enquiry.")} target="_blank" rel="noreferrer" className="btn btn-wa mt-8"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>
      <p className="mt-8 text-sm text-muted-foreground">Phone: +{settings.whatsapp} · Location: Lagos, Nigeria (temporary details)</p>
    </div>
  );
}
