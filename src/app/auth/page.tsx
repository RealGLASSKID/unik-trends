"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useApp } from "@/lib/app";

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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const done = () => {
    const next = new URLSearchParams(location.search).get("next") || "/shop";
    router.push(next);
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      done();
    } catch (e) {
      setMsg((e as Error).message.replace("Firebase: ", ""));
    }
    setBusy(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pw);
      } else {
        const c = await createUserWithEmailAndPassword(auth, email, pw);
        if (name) await updateProfile(c.user, { displayName: name });
        await sendEmailVerification(c.user);
        await ensureUserDoc(c.user, { name });
      }
    });
  };

  if (authLoading) {
    return <div className="px-4 py-20 text-center">Loading…</div>;
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-5xl">You&apos;re signed in</h1>
        <p className="mt-3 text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-8 grid gap-3">
          <Link href="/shop" className="btn">
            Continue shopping
          </Link>
          {isAdmin && (
            <Link href="/admin" className="btn btn-accent">
              Open admin dashboard
            </Link>
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
      <h1 className="text-5xl">{mode === "login" ? "Log in" : "Sign up"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Browse freely. Log in only when you are ready to book or place an order.
      </p>
      <form onSubmit={submit} className="mt-8 grid gap-3">
        {mode === "signup" && (
          <input
            className="field"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          placeholder="Password (min 6 characters)"
          minLength={6}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <button className="btn" disabled={busy}>
          {mode === "login" ? "Log in" : "Create account"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const res = await signInWithPopup(auth, new GoogleAuthProvider());
              await ensureUserDoc(res.user);
            })
          }
        >
          Continue with Google
        </button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <button
          className="underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
        </button>
        {mode === "login" && (
          <button
            className="underline"
            onClick={() =>
              email
                ? sendPasswordResetEmail(auth, email)
                    .then(() => setMsg("Reset link sent to your email."))
                    .catch((e) => setMsg(e.message))
                : setMsg("Enter your email first.")
            }
          >
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
