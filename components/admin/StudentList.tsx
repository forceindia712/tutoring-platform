"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
} from "@/components/ui";
import { StudentForm } from "@/components/admin/StudentForm";
import { StudentLink } from "@/components/admin/StudentLink";
import { apiErrorMessage, studentFullName } from "@/lib/admin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Student } from "@/lib/types";

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSupabaseBrowserClient()
      .from("students")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setError(apiErrorMessage(loadError, "Nie udało się pobrać uczniów."));
        } else {
          setStudents((data ?? []) as Student[]);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleSaved(saved: Student) {
    if (editing) {
      setStudents((current) =>
        current.map((student) => (student.id === saved.id ? saved : student)),
      );
      setEditing(null);
      setCreating(false);
      return;
    }

    setCreatedStudent(saved);
    setStudents((current) => [...current, saved]);
    setCreating(false);
  }

  async function handleDelete(student: Student) {
    if (
      !window.confirm(
        `Usunąć ucznia ${studentFullName(student)}? Jego spotkania i materiały również zostaną usunięte.`,
      )
    ) {
      return;
    }

    setError(null);
    const { error: deleteError } = await getSupabaseBrowserClient()
      .from("students")
      .delete()
      .eq("id", student.id);

    if (deleteError) {
      setError(apiErrorMessage(deleteError, "Nie udało się usunąć ucznia."));
      return;
    }
    setStudents((current) =>
      current.filter((item) => item.id !== student.id),
    );
    if (createdStudent?.id === student.id) setCreatedStudent(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Uczniowie
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Dodawaj uczniów i zarządzaj ich spotkaniami.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          disabled={creating}
        >
          Dodaj ucznia
        </Button>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      {creating ? (
        <div className="mt-6">
          <StudentForm
            onSaved={handleSaved}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : null}

      {editing ? (
        <div className="mt-6">
          <StudentForm
            student={editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : null}

      {createdStudent ? (
        <div className="mt-6">
          <StudentLink student={createdStudent} />
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-500">Wczytywanie uczniów…</p>
        ) : null}
        {!loading && students.length === 0 ? (
          <EmptyState>
            Nie masz jeszcze uczniów. Kliknij „Dodaj ucznia”.
          </EmptyState>
        ) : null}

        {students.map((student) => {
          const details = [
            student.email,
            student.notes,
          ].filter(Boolean) as string[];
          return (
            <Card
              key={student.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">
                  {studentFullName(student)}
                </p>
                {details.length > 0 ? (
                  <p className="mt-0.5 truncate text-sm text-zinc-500">
                    {details.join(" · ")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/students/${student.id}`}
                  className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  Otwórz
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(student);
                    setCreating(false);
                  }}
                >
                  Edytuj
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete(student)}
                >
                  Usuń
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
