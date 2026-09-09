"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink, ErrorNote } from "@/components/ui";
import { MeetingForm } from "@/components/admin/MeetingForm";
import { getStudent } from "@/lib/firebase/clientDb";
import { studentFullName } from "@/lib/admin";
import type { Student } from "@/lib/types";

export function NewMeetingForStudent({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getStudent(studentId)
      .then((data) => {
        if (active) setStudent(data);
      })
      .catch(() => {
        if (active) setError("Nie znaleziono ucznia.");
      });
    return () => {
      active = false;
    };
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
