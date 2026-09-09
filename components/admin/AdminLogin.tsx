"use client";

import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    try {
      const unsubscribe = onAuthStateChanged(getFirebaseAuthClient(), (user) => {
        if (!active) return;
        if (user) {
          router.replace("/admin/dashboard");
          return;
        }
        if (active) setChecking(false);
      });
      return () => {
        active = false;
        unsubscribe();
      };
    } catch {
      window.setTimeout(() => {
        if (!active) return;
        setError(
          "Brak konfiguracji Firebase. Dodaj zmienne środowiskowe i odśwież stronę.",
        );
        setChecking(false);
      }, 0);
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(
        getFirebaseAuthClient(),
        email.trim(),
        password,
      );
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Nieprawidłowy adres e-mail lub hasło.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="text-sm text-zinc-500">
        Sprawdzanie sesji…
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Panel nauczyciela
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Zaloguj się, aby zarządzać uczniami i spotkaniami.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Field label="E-mail" htmlFor="admin-email">
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            required
          />
        </Field>

        <Field label="Hasło" htmlFor="admin-password">
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            required
          />
        </Field>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logowanie…" : "Zaloguj się"}
        </Button>
      </form>

      <Link
        href="/"
        className="mt-6 block text-center text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        ← Wróć na stronę ucznia
      </Link>
    </Card>
  );
}
