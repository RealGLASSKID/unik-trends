"use client";

import { AppProvider } from "@/lib/app";
import { Header, Footer, WhatsAppButton } from "@/components/Chrome";
import { PwaRegister } from "@/components/PwaRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <WhatsAppButton />
      <PwaRegister />
    </AppProvider>
  );
}
