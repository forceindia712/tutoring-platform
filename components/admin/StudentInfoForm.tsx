"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  ErrorNote,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import {
  createStudentInfo,
  updateStudentInfo,
} from "@/lib/firebase/clientDb";
import type { StudentInfo } from "@/lib/types";

type StudentInfoFormProps = {
  studentId: string;
  sortOrder?: number;
  info?: StudentInfo | null;
  onSaved: () => void;
  onCancel?: () => void;
};

export function StudentInfoForm({
  studentId,
  sortOrder,
  info,
  onSaved,
  onCancel,
}: StudentInfoFormProps) {
  const isEditing = Boolean(info);
  const [title, setTitle] = useState(info?.title ?? "");
  const [content, setContent] = useState(info?.content ?? "");
  const [url, setUrl] = useState(info?.url ?? "");
  const [urlLabel, setUrlLabel] = useState(info?.url_label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim() || null,
        url: url.trim() || null,
        url_label: urlLabel.trim() || null,
        sort_order: info?.sort_order ?? sortOrder ?? 1,
      };

      if (info) {
        await updateStudentInfo(info.id, payload);
      } else {
        await createStudentInfo(studentId, payload);
      }

      onSaved();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Nie udało się zapisać informacji.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5"
      onSubmit={handleSubmit}
    >
      <p className="font-semibold text-zinc-900">
        {isEditing ? "Edytuj informację" : "Dodaj informację"}
      </p>

      <Field
        label="Tytuł"
        htmlFor="student-info-title"
        hint="np. Harmonogram spotkań, Link do spotkań online"
      >
        <Input
          id="student-info-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={saving}
          placeholder="np. Harmonogram"
        />
      </Field>

      <Field
        label="Treść"
        htmlFor="student-info-content"
        hint="Ogólne informacje, np. „Spotkania stacjonarne odbywają się w każdy wtorek o 17:00”."
      >
        <Textarea
          id="student-info-content"
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={saving}
          placeholder="np. Spotkania online odbywają się w każdą środę o 18:00."
        />
      </Field>

      <Field
        label="Link (opcjonalnie)"
        htmlFor="student-info-url"
        hint="np. stały link do spotkań online"
      >
        <Input
          id="student-info-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          disabled={saving}
        />
      </Field>

      <Field
        label="Tekst przycisku (opcjonalnie)"
        htmlFor="student-info-url-label"
        hint="Domyślnie: „Otwórz link”."
      >
        <Input
          id="student-info-url-label"
          value={urlLabel}
          onChange={(event) => setUrlLabel(event.target.value)}
          placeholder="Otwórz link"
          disabled={saving}
        />
      </Field>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Zapisywanie…" : isEditing ? "Zapisz zmiany" : "Dodaj"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Anuluj
          </Button>
        ) : null}
      </div>
    </form>
  );
}
