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
import { MATERIAL_BUCKET, MATERIAL_TYPES } from "@/lib/constants";
import { apiErrorMessage } from "@/lib/admin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Material, MaterialType } from "@/lib/types";

type MaterialFormProps = {
  meetingId: string;
  sortOrder?: number;
  material?: Material | null;
  onSaved: () => void;
  onCancel?: () => void;
};

function safeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "plik"
  );
}

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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadFile(): Promise<string | null> {
    if (!file) return null;
    const id =
      (typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function" &&
        crypto.randomUUID()) ||
      `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const path = `${meetingId}/${id}-${safeFileName(file.name)}`;
    const { error: uploadError } = await getSupabaseBrowserClient()
      .storage.from(MATERIAL_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      throw new Error(
        `Nie udało się przesłać pliku: ${uploadError.message}`,
      );
    }
    return path;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    let fileToRemove: string | null = null;

    try {
      let fileUrl = material?.file_url ?? null;
      if (type === "file" && file) {
        fileUrl = await uploadFile();
        if (material?.file_url && material.file_url !== fileUrl) {
          fileToRemove = material.file_url;
        }
      } else if (type !== "file") {
        fileToRemove = material?.file_url ?? null;
        fileUrl = null;
      }

      const payload = {
        type,
        title: title.trim(),
        description: description.trim() || null,
        url: type === "link" ? url.trim() || null : null,
        file_url: fileUrl,
        sort_order:
          material?.sort_order ?? sortOrder ?? material?.sort_order ?? 0,
      };

      let result;
      if (material) {
        result = await getSupabaseBrowserClient()
          .from("materials")
          .update(payload)
          .eq("id", material.id)
          .select()
          .single();
      } else {
        result = await getSupabaseBrowserClient()
          .from("materials")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (fileToRemove) {
        await getSupabaseBrowserClient()
          .storage.from(MATERIAL_BUCKET)
          .remove([fileToRemove])
          .catch(() => undefined);
      }

      onSaved();
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Nie udało się zapisać materiału. Sprawdź, czy wszystkie wymagane pola są wypełnione.",
        ),
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
            type === "assignment" ? "np. Zadanie domowe" : "np. Ćwiczenia Past Simple"
          }
        />
      </Field>

      <Field
        label="Opis / treść"
        htmlFor="material-description"
        hint={
          type === "text" ||
          type === "assignment" ||
          type === "note"
            ? "Tutaj wpisz pełną treść materiału."
            : "Krótki opis (opcjonalnie)."
        }
      >
        <Textarea
          id="material-description"
          rows={type === "text" || type === "assignment" || type === "note" ? 6 : 3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={saving}
          placeholder={
            type === "assignment"
              ? "Wykonaj ćwiczenia 1–5."
              : undefined
          }
        />
      </Field>

      {type === "link" ? (
        <Field label="URL" htmlFor="material-url">
          <Input
            id="material-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            disabled={saving}
            required={type === "link"}
          />
        </Field>
      ) : null}

      {type === "file" ? (
        <Field
          label="Plik"
          htmlFor="material-file"
          hint={
            material?.file_url && !file
              ? "Poprzedni plik zostanie zachowany, jeśli nie wybierzesz nowego."
              : "PDF, DOCX, JPG itp."
          }
        >
          <Input
            id="material-file"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={saving}
            required={type === "file" && !material?.file_url}
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
