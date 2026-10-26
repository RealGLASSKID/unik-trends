"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppProvider, useApp } from "@/lib/app";
import { Header, Footer, WhatsAppButton } from "@/components/Chrome";
import { LogoLoader, Welcome } from "@/components/Brand";
import { PwaRegister } from "@/components/PwaRegister";

const OPEN = ["/auth"]; // admin login without going through welcome
const WELCOME_KEY = "unik_welcome_done";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  const path = usePathname();
  const [splash, setSplash] = useState(true);
  const [welcomeDone, setWelcomeDone] = useState(true); // default true until we read storage (avoid flash)

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      setWelcomeDone(localStorage.getItem(WELCOME_KEY) === "1");
    } catch {
      setWelcomeDone(false);
    }
  }, []);

  // Once Firebase restores a signed-in user, never show welcome again
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(WELCOME_KEY, "1");
      } catch {
        /* ignore */
      }
      setWelcomeDone(true);
    }
  }, [user]);

  if (authLoading || splash) return <LogoLoader full />;
  // Show welcome only for first-time visitors who are not signed in
  if (!user && !welcomeDone && !OPEN.includes(path)) {
    return (
      <Welcome
        onDone={() => {
          try {
            localStorage.setItem(WELCOME_KEY, "1");
          } catch {
            /* ignore */
          }
          setWelcomeDone(true);
        }}
      />
    );
  }
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <WhatsAppButton />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("unik-theme");
    const dark = stored ? stored === "dark" : true;
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  return (
    <AppProvider>
      <Shell>{children}</Shell>
      <PwaRegister />
    </AppProvider>
  );
}
