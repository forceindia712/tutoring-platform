"use client";

import { useEffect, useState } from "react";
import { BackLink, Card, ErrorNote, SuccessNote } from "@/components/ui";
import { MaterialsManager } from "@/components/admin/MaterialsManager";
import { MeetingForm } from "@/components/admin/MeetingForm";
import { studentFullName, toStudentSummary } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Meeting } from "@/lib/types";

export function MeetingEditor({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [student, setStudent] = useState<{
    id: string;
    first_name: string;
    last_name: string;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSupabaseBrowserClient()
      .from("meetings")
      .select("*, student:students(id, first_name, last_name)")
      .eq("id", meetingId)
      .single()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setError("Nie udało się pobrać spotkania.");
          setLoading(false);
          return;
        }
        const row = data as Meeting & { student?: unknown };
        setMeeting(row);
        setStudent(toStudentSummary(row.student));
        setSaved(false);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [meetingId]);

  async function refresh() {
    const { data, error: loadError } = await getSupabaseBrowserClient()
      .from("meetings")
      .select("*, student:students(id, first_name, last_name)")
      .eq("id", meetingId)
      .single();
    if (loadError) {
      setError("Nie udało się odświeżyć spotkania.");
      return;
    }
    setMeeting(data as Meeting);
    setStudent(toStudentSummary((data as Meeting & { student?: unknown }).student));
    setSaved(false);
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Wczytywanie spotkania…</p>;
  }

  if (!meeting) {
    return (
      <div>
        <BackLink href="/admin/dashboard">Panel nauczyciela</BackLink>
        <div className="mt-6">
          <ErrorNote>{error ?? "Nie znaleziono spotkania."}</ErrorNote>
        </div>
      </div>
    );
  }

  const studentLabel = student ? studentFullName(student) : "Uczeń";
  const backHref = student
    ? `/admin/students/${student.id}`
    : "/admin/dashboard";

  return (
    <div>
      <BackLink href={backHref}>
        {student ? `${studentLabel} · profil` : "Panel nauczyciela"}
      </BackLink>

      <div className="mt-5">
        <MeetingForm
          fixedStudent={student}
          meeting={meeting}
          onSaved={() => {
            setSaved(true);
            void refresh();
          }}
        />
      </div>

      {saved ? (
        <div className="mt-4">
          <SuccessNote>Zmiany zostały zapisane.</SuccessNote>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <MaterialsManager meetingId={meeting.id} />
        <aside className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Uczeń
            </p>
            <p className="mt-1 font-medium text-zinc-900">{studentLabel}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Termin
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              {formatDateTime(meeting.meeting_date, meeting.meeting_time)}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Spotkanie #{meeting.meeting_number}
            </p>
            {meeting.meeting_url ? (
              <a
                href={meeting.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
              >
                Otwórz link do spotkania
              </a>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
