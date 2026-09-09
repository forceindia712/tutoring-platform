"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorNote, Field, Input } from "@/components/ui";

const NOT_FOUND_MESSAGE =
  "Nie znaleziono ucznia. Sprawdź wpisane dane lub skontaktuj się z nauczycielem.";

type LookupResponse =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

export function StudentLogin() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    if (name.length < 3) {
      setError(NOT_FOUND_MESSAGE);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/student/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name }),
      });
      const result = (await response.json()) as LookupResponse;

      if (result.ok) {
        router.push(result.redirectTo);
        return;
      }
      setError(result.message || NOT_FOUND_MESSAGE);
    } catch {
      setError(
        "Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Witaj 👋
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Wpisz swoje imię i nazwisko, aby zobaczyć swoje spotkania.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Field label="Imię i nazwisko" htmlFor="student-full-name">
          <Input
            id="student-full-name"
            name="fullName"
            autoComplete="name"
            placeholder="np. Jan Kowalski"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={loading}
            required
          />
        </Field>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sprawdzanie…" : "Przejdź dalej"}
        </Button>
      </form>

      <a
        href="/admin"
        className="mt-6 block text-center text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        Panel nauczyciela
      </a>
    </Card>
  );
}
