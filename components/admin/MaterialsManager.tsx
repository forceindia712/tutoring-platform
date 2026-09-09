"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorNote } from "@/components/ui";
import { MaterialForm } from "@/components/admin/MaterialForm";
import { MATERIAL_TYPE_LABELS, MATERIAL_BUCKET } from "@/lib/constants";
import { apiErrorMessage } from "@/lib/admin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Material } from "@/lib/types";

export function MaterialsManager({ meetingId }: { meetingId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function queryMaterials() {
    return getSupabaseBrowserClient()
      .from("materials")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("sort_order", { ascending: true });
  }

  function applyMaterialsResult({
    data,
    error: loadError,
  }: Awaited<ReturnType<typeof queryMaterials>>) {
    if (loadError) {
      setError(apiErrorMessage(loadError, "Nie udało się pobrać materiałów."));
    } else {
      setMaterials((data ?? []) as Material[]);
    }
    setLoading(false);
  }

  async function load() {
    applyMaterialsResult(await queryMaterials());
  }

  useEffect(() => {
    let active = true;
    getSupabaseBrowserClient()
      .from("materials")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("sort_order", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setError(
            apiErrorMessage(loadError, "Nie udało się pobrać materiałów."),
          );
        } else {
          setMaterials((data ?? []) as Material[]);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [meetingId]);

  async function handleDelete(material: Material) {
    if (!window.confirm(`Usunąć materiał „${material.title}”?`)) {
      return;
    }

    if (material.type === "file" && !window.confirm("Usunąć też plik z Supabase Storage?")) {
      // Usuwamy wyłącznie wpis materiału.
      const { error: rowError } = await getSupabaseBrowserClient()
        .from("materials")
        .delete()
        .eq("id", material.id);
      if (rowError) setError(apiErrorMessage(rowError));
      else await load();
      return;
    }

    const { error: rowError } = await getSupabaseBrowserClient()
      .from("materials")
      .delete()
      .eq("id", material.id);
    if (rowError) {
      setError(apiErrorMessage(rowError, "Nie udało się usunąć materiału."));
      return;
    }
    if (material.file_url) {
      await getSupabaseBrowserClient()
        .storage.from(MATERIAL_BUCKET)
        .remove([material.file_url])
        .catch(() => undefined);
    }
    await load();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= materials.length) return;
    const current = materials[index];
    const next = materials[target];
    setError(null);

    const updates = await Promise.all([
      getSupabaseBrowserClient()
        .from("materials")
        .update({ sort_order: next.sort_order })
        .eq("id", current.id),
      getSupabaseBrowserClient()
        .from("materials")
        .update({ sort_order: current.sort_order })
        .eq("id", next.id),
    ]);

    if (updates.some((result) => result.error)) {
      setError("Nie udało się zmienić kolejności materiałów.");
      return;
    }
    await load();
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Materiały</h2>
        <Button
          variant="secondary"
          onClick={() => {
            setAdding(true);
            setEditing(null);
          }}
          disabled={adding}
        >
          Dodaj materiał
        </Button>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      {adding ? (
        <div className="mt-5">
          <MaterialForm
            meetingId={meetingId}
            sortOrder={materials.length + 1}
            onSaved={() => {
              setAdding(false);
              void load();
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : null}

      {editing ? (
        <div className="mt-5">
          <MaterialForm
            meetingId={meetingId}
            material={editing}
            onSaved={() => {
              setEditing(null);
              void load();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-500">Wczytywanie materiałów…</p>
        ) : null}
        {!loading && materials.length === 0 ? (
          <EmptyState>Brak materiałów do tego spotkania.</EmptyState>
        ) : null}

        {materials.map((material, index) => (
          <Card key={material.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-900">{material.title}</p>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                    {MATERIAL_TYPE_LABELS[material.type] ?? material.type}
                  </span>
                </div>
                {material.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                    {material.description}
                  </p>
                ) : null}
                {material.url ? (
                  <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                    {material.url}
                  </p>
                ) : null}
                {material.file_url ? (
                  <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                    {material.file_url}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void move(index, -1)}
                  disabled={index === 0}
                  aria-label="Przesuń wyżej"
                >
                  ↑
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void move(index, 1)}
                  disabled={index === materials.length - 1}
                  aria-label="Przesuń niżej"
                >
                  ↓
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(material);
                    setAdding(false);
                  }}
                >
                  Edytuj
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete(material)}
                >
                  Usuń
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
