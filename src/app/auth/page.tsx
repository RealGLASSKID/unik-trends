"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const done = () => router.push(new URLSearchParams(location.search).get("next") || "/account");
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setMsg(""); try { await fn(); done(); } catch (e) { setMsg((e as Error).message.replace("Firebase: ", "")); } setBusy(false); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); run(async () => { if (mode === "login") await signInWithEmailAndPassword(auth, email, pw); else { const c = await createUserWithEmailAndPassword(auth, email, pw); if (name) await updateProfile(c.user, { displayName: name }); } }); };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-5xl">{mode === "login" ? "Log in" : "Sign up"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">You can browse without an account. Log in to place an order and track it.</p>
      <form onSubmit={submit} className="mt-8 grid gap-3">
        {mode === "signup" && <input className="field" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />}
        <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="field" type="password" placeholder="Password (min 6 characters)" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <button className="btn" disabled={busy}>{mode === "login" ? "Log in" : "Create account"}</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>Continue with Google</button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <button className="underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "New here? Create an account" : "Have an account? Log in"}</button>
        {mode === "login" && <button className="underline" onClick={() => email ? sendPasswordResetEmail(auth, email).then(() => setMsg("Reset link sent to your email.")).catch((e) => setMsg(e.message)) : setMsg("Enter your email first.")}>Forgot password?</button>}
      </div>
    </div>
  );
}
