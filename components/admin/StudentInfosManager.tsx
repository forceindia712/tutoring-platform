"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, ErrorNote } from "@/components/ui";
import { StudentInfoForm } from "@/components/admin/StudentInfoForm";
import {
  deleteStudentInfo,
  listStudentInfos,
  moveStudentInfo,
} from "@/lib/firebase/clientDb";
import type { StudentInfo } from "@/lib/types";

export function StudentInfosManager({ studentId }: { studentId: string }) {
  const [infos, setInfos] = useState<StudentInfo[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StudentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setInfos(await listStudentInfos(studentId));
      setError(null);
    } catch {
      setError("Nie udało się pobrać informacji.");
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    listStudentInfos(studentId)
      .then((data) => {
        if (!active) return;
        setInfos(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się pobrać informacji.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  async function handleDelete(info: StudentInfo) {
    if (!window.confirm(`Usunąć informację „${info.title}”?`)) {
      return;
    }
    setError(null);
    try {
      await deleteStudentInfo(info.id);
      setInfos((current) => current.filter((item) => item.id !== info.id));
    } catch {
      setError("Nie udało się usunąć informacji.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= infos.length) return;
    const current = infos[index];
    const next = infos[target];
    setError(null);

    try {
      await Promise.all([
        moveStudentInfo(current.id, next.sort_order),
        moveStudentInfo(next.id, current.sort_order),
      ]);
      setInfos((items) => {
        const copy = [...items];
        copy[index] = next;
        copy[target] = current;
        return copy;
      });
    } catch {
      setError("Nie udało się zmienić kolejności.");
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">
          Informacje ogólne dla ucznia
        </h2>
        <Button
          variant="secondary"
          onClick={() => {
            setAdding(true);
            setEditing(null);
          }}
          disabled={adding}
        >
          Dodaj informację
        </Button>
      </div>

      <p className="mt-1 text-sm text-zinc-500">
        Ta sekcja pojawi się na stronie ucznia – np. harmonogram albo stały
        link do spotkań.
      </p>

      {error ? (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      {adding ? (
        <div className="mt-5">
          <StudentInfoForm
            studentId={studentId}
            sortOrder={infos.length + 1}
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
          <StudentInfoForm
            studentId={studentId}
            info={editing}
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
          <p className="text-sm text-zinc-500">Wczytywanie informacji…</p>
        ) : null}
        {!loading && infos.length === 0 ? (
          <EmptyState>
            Brak ogólnych informacji dla tego ucznia.
          </EmptyState>
        ) : null}

        {infos.map((info, index) => (
          <Card key={info.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{info.title}</p>
                {info.content ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                    {info.content}
                  </p>
                ) : null}
                {info.url ? (
                  <a
                    href={info.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
                  >
                    {info.url_label ?? "Otwórz link"}
                  </a>
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
                  disabled={index === infos.length - 1}
                  aria-label="Przesuń niżej"
                >
                  ↓
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(info);
                    setAdding(false);
                  }}
                >
                  Edytuj
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete(info)}
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
