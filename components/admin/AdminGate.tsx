"use client";

import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    try {
      const unsubscribe = onAuthStateChanged(getFirebaseAuthClient(), (user) => {
        if (!active) return;
        if (!user) {
          router.replace("/admin");
          return;
        }
        setChecking(false);
      });
      return () => {
        active = false;
        unsubscribe();
      };
    } catch {
      if (active) router.replace("/admin");
    }
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-zinc-500">Sprawdzanie sesji…</p>
      </main>
    );
  }

  return children;
}
