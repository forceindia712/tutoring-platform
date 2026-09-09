"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink, Button, Card, EmptyState, ErrorNote } from "@/components/ui";
import { StudentForm } from "@/components/admin/StudentForm";
import { StudentLink } from "@/components/admin/StudentLink";
import { StudentInfosManager } from "@/components/admin/StudentInfosManager";
import { deleteStudent, getStudent, listMeetingsForStudent } from "@/lib/firebase/clientDb";
import { studentFullName } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import type { Meeting, Student } from "@/lib/types";

export function StudentProfile({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getStudent(studentId), listMeetingsForStudent(studentId)])
      .then(([studentResult, meetingsResult]) => {
        if (!active) return;
        setStudent(studentResult);
        setMeetings(meetingsResult);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się pobrać profilu ucznia.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  async function handleDelete() {
    if (!student) return;
    if (
      !window.confirm(
        `Usunąć ucznia ${studentFullName(student)}? Jego spotkania, materiały i informacje również zostaną usunięte.`,
      )
    ) {
      return;
    }
    try {
      await deleteStudent(student.id);
      router.push("/admin/students");
      router.refresh();
    } catch {
      setError("Nie udało się usunąć ucznia.");
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Wczytywanie profilu…</p>;
  }

  if (!student) {
    return (
      <div>
        <BackLink href="/admin/students">Uczniowie</BackLink>
        <div className="mt-6">
          <ErrorNote>Nie znaleziono ucznia.</ErrorNote>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackLink href="/admin/students">Uczniowie</BackLink>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {studentFullName(student)}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Spotkania: {meetings.length}
            {student.email ? ` · ${student.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? "Zamknij edycję" : "Edytuj"}
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            Usuń ucznia
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-6">
          <StudentForm
            student={student}
            onSaved={(saved) => {
              setStudent(saved);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <StudentLink student={student} />
      </div>

      {student.notes ? (
        <Card className="mt-6 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Notatka
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
            {student.notes}
          </p>
        </Card>
      ) : null}

      <div className="mt-10">
        <StudentInfosManager studentId={student.id} />
      </div>

      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Spotkania</h2>
          <Link
            href={`/admin/students/${student.id}/meetings/new`}
            className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Dodaj spotkanie
          </Link>
        </div>

        {meetings.length === 0 ? (
          <div className="mt-4">
            <EmptyState>Ten uczeń nie ma jeszcze żadnych spotkań.</EmptyState>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {meetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-zinc-900">
                    Spotkanie #{meeting.meeting_number}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {formatDateTime(meeting.meeting_date, meeting.meeting_time)}
                  </p>
                  {!meeting.meeting_url ? (
                    <p className="mt-0.5 text-sm text-zinc-500">
                      Spotkanie stacjonarne
                      {meeting.meeting_location
                        ? ` · ${meeting.meeting_location}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/admin/meetings/${meeting.id}`}
                  className="inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  Edytuj spotkanie
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
