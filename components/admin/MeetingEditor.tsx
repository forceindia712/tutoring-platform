"use client";

import { useEffect, useState } from "react";
import { BackLink, Card, ErrorNote, SuccessNote } from "@/components/ui";
import { MaterialsManager } from "@/components/admin/MaterialsManager";
import { MeetingForm } from "@/components/admin/MeetingForm";
import { getMeeting, getStudent } from "@/lib/firebase/clientDb";
import { studentFullName } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import type { Meeting, Student } from "@/lib/types";

export function MeetingEditor({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [student, setStudent] = useState<
    Pick<Student, "id" | "first_name" | "last_name"> | null
  >(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMeeting() {
    const meetingData = await getMeeting(meetingId);
    if (!meetingData) {
      setError("Nie znaleziono spotkania.");
      setLoading(false);
      return;
    }

    const studentData = await getStudent(meetingData.student_id);
    setMeeting(meetingData);
    setStudent(
      studentData
        ? {
            id: studentData.id,
            first_name: studentData.first_name,
            last_name: studentData.last_name,
          }
        : null,
    );
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    getMeeting(meetingId)
      .then(async (meetingData) => {
        if (!meetingData) {
          if (!active) return;
          setError("Nie znaleziono spotkania.");
          setLoading(false);
          return;
        }
        const studentData = await getStudent(meetingData.student_id);
        if (!active) return;
        setMeeting(meetingData);
        setStudent(
          studentData
            ? {
                id: studentData.id,
                first_name: studentData.first_name,
                last_name: studentData.last_name,
              }
            : null,
        );
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się pobrać spotkania.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [meetingId]);

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

  const backHref = student
    ? `/admin/students/${student.id}`
    : "/admin/dashboard";

  return (
    <div>
      <BackLink href={backHref}>
        {student ? `${studentFullName(student)} · profil` : "Panel nauczyciela"}
      </BackLink>

      <div className="mt-5">
        <MeetingForm
          fixedStudent={student}
          meeting={meeting}
          onSaved={() => {
            setSaved(true);
            void loadMeeting();
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
            <p className="mt-1 font-medium text-zinc-900">
              {student ? studentFullName(student) : "Uczeń"}
            </p>
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
            {!meeting.meeting_url ? (
              <p className="mt-3 text-sm text-zinc-600">
                Spotkanie stacjonarne
                {meeting.meeting_location
                  ? ` · ${meeting.meeting_location}`
                  : ""}
              </p>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
