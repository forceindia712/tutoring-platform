"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Card, ErrorNote, Field, Input, Textarea } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { generateAccessToken } from "@/lib/token";
import type { Student } from "@/lib/types";

type StudentFormProps = {
  student?: Student | null;
  onSaved: (student: Student) => void;
  onCancel?: () => void;
};

export function StudentForm({ student, onSaved, onCancel }: StudentFormProps) {
  const isEditing = Boolean(student);
  const [firstName, setFirstName] = useState(student?.first_name ?? "");
  const [lastName, setLastName] = useState(student?.last_name ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [notes, setNotes] = useState(student?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const client = getSupabaseBrowserClient();
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
      };

      let result;
      if (student) {
        result = await client
          .from("students")
          .update(payload)
          .eq("id", student.id)
          .select()
          .single();
      } else {
        result = await client
          .from("students")
          .insert({
            ...payload,
            student_access_token: generateAccessToken(),
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;
      onSaved(result.data as Student);
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? "Nie udało się zapisać ucznia. Sprawdź, czy nie ma duplikatu imienia i nazwiska."
          : "Nie udało się zapisać ucznia.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold text-zinc-900">
        {isEditing ? "Edytuj ucznia" : "Dodaj ucznia"}
      </h2>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <Field label="Imię" htmlFor="student-first-name">
          <Input
            id="student-first-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
            disabled={saving}
          />
        </Field>
        <Field label="Nazwisko" htmlFor="student-last-name">
          <Input
            id="student-last-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
            disabled={saving}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="E-mail (opcjonalnie)" htmlFor="student-email">
            <Input
              id="student-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Notatka (opcjonalnie)"
            htmlFor="student-notes"
            hint="Widoczna tylko w panelu nauczyciela."
          >
            <Textarea
              id="student-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={saving}
            />
          </Field>
        </div>

        {error ? <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div> : null}

        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Zapisywanie…"
              : isEditing
                ? "Zapisz zmiany"
                : "Dodaj ucznia"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Anuluj
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
