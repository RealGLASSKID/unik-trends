"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppProvider, useApp } from "@/lib/app";
import { Header, Footer, WhatsAppButton } from "@/components/Chrome";
import { LogoLoader, Welcome } from "@/components/Brand";
import { PwaRegister } from "@/components/PwaRegister";

const OPEN = ["/auth"]; // admin email/password login stays reachable without Google

function Shell({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  const path = usePathname();
  const [splash, setSplash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setSplash(false), 1400); return () => clearTimeout(t); }, []);
  if (authLoading || splash) return <LogoLoader full />;
  if (!user && !OPEN.includes(path)) return <Welcome />;
  return (
    <>
      <div className="flex min-h-screen flex-col"><Header /><main className="flex-1">{children}</main><Footer /></div>
      <WhatsAppButton />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("unik-theme");
    const dark = stored ? stored === "dark" : true; // default dark
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  return <AppProvider><Shell>{children}</Shell><PwaRegister /></AppProvider>;
}
