"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ADMIN_EMAIL, useApp } from "@/lib/app";
import { GoogleButton, LogoLoader } from "@/components/Brand";

async function ensureUserDoc(u: User, extra?: { name?: string }) {
  await setDoc(
    doc(db, "users", u.uid),
    {
      email: u.email ?? "",
      name: extra?.name || u.displayName || "",
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export default function AuthPage() {
  const router = useRouter();
  const { user, isAdmin, authLoading } = useApp();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const done = (admin?: boolean) => {
    const next =
      new URLSearchParams(location.search).get("next") ||
      (admin ? "/admin" : "/shop");
    router.push(next);
  };

  const run = async (fn: () => Promise<unknown>, asAdmin?: boolean) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      done(asAdmin);
    } catch (e) {
      setMsg((e as Error).message.replace("Firebase: ", ""));
    }
    setBusy(false);
  };

  if (authLoading) {
    return <LogoLoader />;
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-5xl">You&apos;re signed in</h1>
        <p className="mt-3 text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-8 grid gap-3">
          <Link href="/shop" className="btn">Continue shopping</Link>
          {isAdmin && (
            <Link href="/admin" className="btn btn-accent">Open admin dashboard</Link>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => signOut(auth).then(() => router.refresh())}
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-5xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Customers sign in with Google. Admins can also use email and password below.
      </p>

      <div className="mt-8"><GoogleButton label="Continue with Google" /></div>

      <button
        type="button"
        className="mt-8 text-xs uppercase tracking-wider text-muted-foreground underline"
        onClick={() => setShowAdmin((v) => !v)}
      >
        {showAdmin ? "Hide admin login" : "Admin login"}
      </button>

      {showAdmin && (
        <form
          className="mt-4 grid gap-3 border-2 border-primary p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
              await ensureUserDoc(cred.user);
            }, true);
          }}
        >
          <p className="text-xs text-muted-foreground">
            Owner / admin only — email &amp; password. No verification email.
          </p>
          <input
            className="field"
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            minLength={6}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />
          {msg && <p className="text-sm text-destructive">{msg}</p>}
          <button className="btn btn-accent" disabled={busy}>
            {busy ? "Signing in…" : "Admin log in"}
          </button>
        </form>
      )}

      {msg && !showAdmin && <p className="mt-3 text-sm text-destructive">{msg}</p>}
    </div>
  );
}