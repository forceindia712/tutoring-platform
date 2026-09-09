"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  ErrorNote,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  createMaterial,
  updateMaterial,
} from "@/lib/firebase/clientDb";
import { MATERIAL_TYPES } from "@/lib/constants";
import type { Material, MaterialType } from "@/lib/types";

type MaterialFormProps = {
  meetingId: string;
  sortOrder?: number;
  material?: Material | null;
  onSaved: () => void;
  onCancel?: () => void;
};

export function MaterialForm({
  meetingId,
  sortOrder,
  material,
  onSaved,
  onCancel,
}: MaterialFormProps) {
  const isEditing = Boolean(material);
  const [type, setType] = useState<MaterialType>(
    (material?.type as MaterialType) ?? "link",
  );
  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [url, setUrl] = useState(material?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isLinkLike = type === "link" || type === "file";
      const payload = {
        type,
        title: title.trim(),
        description: description.trim() || null,
        url: isLinkLike ? url.trim() || null : null,
        sort_order: material?.sort_order ?? sortOrder ?? 1,
      };

      if (material) {
        await updateMaterial(material.id, payload);
      } else {
        await createMaterial(meetingId, payload);
      }

      onSaved();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Nie udało się zapisać materiału.",
      );
    } finally {
      setSaving(false);
    }
  }

  const isTextType =
    type === "text" || type === "assignment" || type === "note";
  const isLinkLike = type === "link" || type === "file";

  return (
    <form
      className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5"
      onSubmit={handleSubmit}
    >
      <p className="font-semibold text-zinc-900">
        {isEditing ? "Edytuj materiał" : "Dodaj materiał"}
      </p>

      <Field label="Typ materiału" htmlFor="material-type">
        <Select
          id="material-type"
          value={type}
          onChange={(event) => setType(event.target.value as MaterialType)}
          disabled={saving}
        >
          {MATERIAL_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tytuł" htmlFor="material-title">
        <Input
          id="material-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={saving}
          placeholder={
            type === "assignment"
              ? "np. Zadanie domowe"
              : "np. Ćwiczenia Past Simple"
          }
        />
      </Field>

      <Field
        label="Opis / treść"
        htmlFor="material-description"
        hint={
          isTextType
            ? "Tutaj wpisz pełną treść materiału."
            : "Krótki opis (opcjonalnie)."
        }
      >
        <Textarea
          id="material-description"
          rows={isTextType ? 6 : 3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={saving}
          placeholder={
            type === "assignment" ? "Wykonaj ćwiczenia 1–5." : undefined
          }
        />
      </Field>

      {isLinkLike ? (
        <Field
          label={type === "file" ? "Link do pliku" : "URL"}
          htmlFor="material-url"
          hint={
            type === "file"
              ? "Wklej link do pliku, np. z Google Drive (udostępnij jako „każdy, kto ma link”)."
              : "Link do strony, wideo itp."
          }
        >
          <Input
            id="material-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            disabled={saving}
            required
          />
        </Field>
      ) : null}

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
