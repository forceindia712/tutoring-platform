"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink, ErrorNote } from "@/components/ui";
import { MeetingForm } from "@/components/admin/MeetingForm";
import { apiErrorMessage, studentFullName } from "@/lib/admin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Student } from "@/lib/types";

export function NewMeetingForStudent({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseBrowserClient()
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError) {
          setError(apiErrorMessage(loadError, "Nie znaleziono ucznia."));
        } else {
          setStudent(data as Student);
        }
      });
  }, [studentId]);

  return (
    <div>
      <BackLink href={`/admin/students/${studentId}`}>Profil ucznia</BackLink>
      <div className="mt-5">
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {!student && !error ? (
          <p className="text-sm text-zinc-500">Wczytywanie…</p>
        ) : null}
        {student ? (
          <>
            <p className="mb-3 text-sm text-zinc-500">
              Tworzysz spotkanie dla:{" "}
              <span className="font-medium text-zinc-900">
                {studentFullName(student)}
              </span>
            </p>
            <MeetingForm
              fixedStudent={student}
              onSaved={(meetingId) => {
                router.push(`/admin/meetings/${meetingId}`);
                router.refresh();
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
