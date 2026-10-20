"use client";
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "unik_pwa_install_dismissed";
const DISMISS_DAYS = 7;

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq || ios;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (isStandalone() || wasDismissedRecently()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Small delay so it doesn't fight first paint
      setTimeout(() => setShow(true), 2500);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS has no beforeinstallprompt — show manual Add to Home Screen tip
    if (isIos()) {
      setTimeout(() => {
        if (!isStandalone() && !wasDismissedRecently()) {
          setIosHint(true);
          setShow(true);
        }
      }, 4000);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = () => {
    setShow(false);
    setIosHint(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
        setDeferred(null);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
    setInstalling(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-[55] mx-auto max-w-md border-2 border-primary bg-background p-4 shadow-block md:bottom-6 md:left-auto md:right-6"
      role="dialog"
      aria-label="Install app"
    >
      <button
        type="button"
        className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-96.png"
          alt=""
          className="h-12 w-12 shrink-0 border-2 border-primary object-contain"
        />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight">Install UNIK TRENDS</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {iosHint
              ? "Add to your Home Screen for faster access and order alerts."
              : "Install the app on your phone for a faster experience and notifications."}
          </p>
        </div>
      </div>

      {iosHint ? (
        <p className="mt-3 flex items-start gap-2 border-t-2 border-border pt-3 text-xs text-muted-foreground">
          <Share className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Tap the <b>Share</b> button in Safari, then choose{" "}
            <b>Add to Home Screen</b>.
          </span>
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn btn-accent flex-1 !py-2 text-xs"
            disabled={installing || !deferred}
            onClick={install}
          >
            <Download className="h-4 w-4" />
            {installing ? "Installing…" : "Install app"}
          </button>
          <button type="button" className="btn btn-ghost !py-2 text-xs" onClick={dismiss}>
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
