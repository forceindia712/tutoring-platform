"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Card, ErrorNote, Field, Input, Textarea } from "@/components/ui";
import { createStudent, updateStudent } from "@/lib/firebase/clientDb";
import { normalizePolishPhone } from "@/lib/notifications/phone";
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
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [parentName, setParentName] = useState(student?.parent_name ?? "");
  const [parentEmail, setParentEmail] = useState(student?.parent_email ?? "");
  const [parentPhone, setParentPhone] = useState(student?.parent_phone ?? "");
  const [notes, setNotes] = useState(student?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const phoneNormalized = phone.trim() ? normalizePolishPhone(phone) : null;
    const parentPhoneNormalized = parentPhone.trim()
      ? normalizePolishPhone(parentPhone)
      : null;
    if (phone.trim() && !phoneNormalized) {
      setError("Numer telefonu ucznia jest niepoprawny (podaj 9 cyfr, np. 600 100 200).");
      setSaving(false);
      return;
    }
    if (parentPhone.trim() && !parentPhoneNormalized) {
      setError("Numer telefonu rodzica jest niepoprawny (podaj 9 cyfr, np. 600 100 200).");
      setSaving(false);
      return;
    }

    const input = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phoneNormalized,
      parent_name: parentName.trim() || null,
      parent_email: parentEmail.trim() || null,
      parent_phone: parentPhoneNormalized,
      notes: notes.trim() || null,
    };

    try {
      if (student) {
        await updateStudent(student.id, input);
        onSaved({
          ...student,
          ...input,
        });
      } else {
        const created = await createStudent(input);
        onSaved(created);
      }
    } catch {
      setError("Nie udało się zapisać ucznia. Spróbuj ponownie.");
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
        <Field label="E-mail ucznia (opcjonalnie)" htmlFor="student-email">
          <Input
            id="student-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={saving}
          />
        </Field>
        <Field
          label="Telefon ucznia (opcjonalnie)"
          htmlFor="student-phone"
          hint="Polski numer, np. 600 100 200."
        >
          <Input
            id="student-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={saving}
          />
        </Field>
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-zinc-900">
            Rodzic / opiekun (opcjonalnie)
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Dane kontaktowe służą tylko do wysyłania powiadomień o spotkaniach.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Field label="Imię i nazwisko rodzica" htmlFor="student-parent-name">
            <Input
              id="student-parent-name"
              value={parentName}
              onChange={(event) => setParentName(event.target.value)}
              disabled={saving}
            />
          </Field>
        </div>
        <Field label="E-mail rodzica" htmlFor="student-parent-email">
          <Input
            id="student-parent-email"
            type="email"
            value={parentEmail}
            onChange={(event) => setParentEmail(event.target.value)}
            disabled={saving}
          />
        </Field>
        <Field label="Telefon rodzica" htmlFor="student-parent-phone">
          <Input
            id="student-parent-phone"
            type="tel"
            value={parentPhone}
            onChange={(event) => setParentPhone(event.target.value)}
            disabled={saving}
          />
        </Field>
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

        {error ? (
          <div className="sm:col-span-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
        ) : null}

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
