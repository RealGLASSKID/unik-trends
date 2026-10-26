"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isOwnerEmail } from "@/lib/app";

/** "UNIK trends" wordmark with a light that sweeps through the letters, again and again. */
export function LogoLoader({ full, label }: { full?: boolean; label?: string }) {
  return (
    <div className={`grid place-items-center ${full ? "fixed inset-0 z-[100] bg-background" : "py-24"}`} role="status" aria-label="Loading">
      <div className="text-center">
        <div className="logo-shine flex items-baseline justify-center gap-2 leading-none">
          <span className="font-display text-6xl md:text-8xl">UNIK</span>
          <span className="text-xl font-bold lowercase tracking-widest md:text-3xl">trends</span>
        </div>
        {label && <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}

export function GoogleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.3 5.7c4.3-4 6.7-9.8 6.7-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.9 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** Google sign-in. Admins (owner email or Team list) are sent to /admin, everyone else to `to`. */
export function GoogleButton({ label = "Sign up with Google", to = "/" }: { label?: string; to?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await setDoc(doc(db, "users", user.uid), { email: user.email ?? "", name: user.displayName ?? "", photo: user.photoURL ?? "", updatedAt: Date.now() }, { merge: true });
      const em = user.email?.toLowerCase() ?? "";
      let admin = isOwnerEmail(em);
      if (!admin && em) admin = await getDoc(doc(db, "admins", em)).then((d) => d.exists()).catch(() => false);
      router.push(admin ? "/admin" : to);
    } catch (e) { setErr((e as Error).message.replace("Firebase: ", "")); setBusy(false); }
  };
  return (
    <div>
      <button type="button" onClick={go} disabled={busy} className="flex w-full items-center justify-center gap-3 border-2 border-primary bg-white px-6 py-3 text-sm font-bold text-neutral-800 shadow-block disabled:opacity-60">
        <GoogleLogo /> {busy ? "Opening Google…" : label}
      </button>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}

/** Welcome screen: image on the left, details on the right (half screen each). Save your design as public/welcome.jpg */
export function Welcome({ onDone }: { onDone?: () => void } = {}) {
  const [step, setStep] = useState<"welcome" | "signup">("welcome");
  const finish = () => { onDone?.(); };
  return (
    <div className="fixed inset-0 z-[90] overflow-auto md:grid md:grid-cols-2">
      {/* Image: full background on mobile, left column on desktop */}
      <div className="pointer-events-none fixed inset-0 md:pointer-events-auto md:relative md:inset-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/welcome.jpg" alt="Welcome to UNIK TRENDS" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { const t = e.currentTarget; if (!t.src.endsWith("/images/hero.jpg")) t.src = "/images/hero.jpg"; }} />
        <div className="absolute inset-0 bg-black/55 md:bg-black/20" />
      </div>
      <div className="relative z-10 flex min-h-full flex-col justify-center px-8 py-12 text-white md:bg-background md:px-16 md:text-foreground">
        <div className="flex items-baseline gap-2"><span className="font-display text-3xl">UNIK</span><span className="text-sm font-bold lowercase tracking-widest text-accent">trends</span></div>
        {step === "welcome" ? (
          <>
            <h1 className="mt-8 text-5xl leading-[0.95] md:text-7xl">Welcome to UNIK TRENDS</h1>
            <p className="mt-5 max-w-md text-white/80 md:text-muted-foreground">Trendy Nigerian streetwear, made by us and sold at wholesale prices. Browse baggy jeans, hoodies and sets for men and women, then order online or book and pay at our shop in Tejuosho, Yaba.</p>
            <ul className="mt-5 grid gap-1 text-sm font-bold"><li>✓ Factory-direct wholesale prices in ₦ and $</li><li>✓ Order online or book and pay at the shop</li><li>✓ Waybill to any state, or pick up in person</li></ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn btn-accent w-fit" onClick={() => setStep("signup")}>Get started</button>
              <button type="button" className="btn btn-ghost w-fit border-white text-white md:border-primary md:text-primary" onClick={finish}>Continue browsing</button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-5xl leading-[0.95] md:text-6xl">Create your account</h1>
            <p className="mt-4 max-w-md text-sm text-white/80 md:text-muted-foreground">One tap with Google. We will remember you on this device, so you only sign up once.</p>
            <div className="mt-8 max-w-sm"><GoogleButton label="Sign up with Google" /></div>
            <button className="mt-6 w-fit text-xs uppercase tracking-wider text-white/70 underline md:text-muted-foreground" onClick={() => setStep("welcome")}>Back</button>
          </>
        )}
        <a href="/auth" className="mt-12 w-fit text-xs uppercase tracking-wider text-white/70 underline md:text-muted-foreground">Admin login</a>
      </div>
    </div>
  );
}
