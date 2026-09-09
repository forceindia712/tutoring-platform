"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorNote } from "@/components/ui";
import { MaterialForm } from "@/components/admin/MaterialForm";
import {
  deleteMaterial,
  listMaterialsForMeeting,
  moveMaterial,
} from "@/lib/firebase/clientDb";
import { MATERIAL_TYPE_LABELS } from "@/lib/constants";
import type { Material } from "@/lib/types";

export function MaterialsManager({ meetingId }: { meetingId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setMaterials(await listMaterialsForMeeting(meetingId));
    } catch {
      setError("Nie udało się pobrać materiałów.");
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    listMaterialsForMeeting(meetingId)
      .then((data) => {
        if (!active) return;
        setMaterials(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się pobrać materiałów.");
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

    setError(null);
    try {
      await deleteMaterial(material.id);
      setMaterials((current) =>
        current.filter((item) => item.id !== material.id),
      );
    } catch {
      setError("Nie udało się usunąć materiału.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= materials.length) return;
    const current = materials[index];
    const next = materials[target];
    setError(null);

    try {
      await Promise.all([
        moveMaterial(current.id, next.sort_order),
        moveMaterial(next.id, current.sort_order),
      ]);
      setMaterials((items) => {
        const copy = [...items];
        copy[index] = next;
        copy[target] = current;
        return copy;
      });
    } catch {
      setError("Nie udało się zmienić kolejności materiałów.");
    }
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
