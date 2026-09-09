"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { apiErrorMessage, studentFullName, todayDateInputValue } from "@/lib/admin";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Meeting, Student } from "@/lib/types";

type MeetingFormProps = {
  fixedStudent?: Pick<Student, "id" | "first_name" | "last_name"> | null;
  meeting?: Meeting | null;
  onSaved: (meetingId: string) => void;
};

export function MeetingForm({
  fixedStudent,
  meeting,
  onSaved,
}: MeetingFormProps) {
  const isEditing = Boolean(meeting);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(
    meeting?.student_id ?? fixedStudent?.id ?? "",
  );
  const [meetingNumber, setMeetingNumber] = useState(
    meeting ? String(meeting.meeting_number) : "",
  );
  const [autoNumber, setAutoNumber] = useState<number | null>(null);
  const [date, setDate] = useState(
    meeting?.meeting_date ?? todayDateInputValue(),
  );
  const [time, setTime] = useState(meeting?.meeting_time.slice(0, 5) ?? "17:00");
  const [url, setUrl] = useState(meeting?.meeting_url ?? "");
  const [instructions, setInstructions] = useState(
    meeting?.instructions ?? "",
  );
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchNextNumber(studentId: string) {
    const { data, error: fetchError } = await getSupabaseBrowserClient()
      .from("meetings")
      .select("meeting_number")
      .eq("student_id", studentId)
      .order("meeting_number", { ascending: false })
      .limit(1);

    if (fetchError) return;
    const numbers = ((data ?? []) as { meeting_number: number }[]).map(
      (row) => row.meeting_number,
    );
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    setAutoNumber(max + 1);
  }

  useEffect(() => {
    if (!fixedStudent) {
      let active = true;
      getSupabaseBrowserClient()
        .from("students")
        .select("id, first_name, last_name")
        .order("first_name", { ascending: true })
        .then(({ data }) => {
          if (active) setStudents((data ?? []) as Student[]);
        });
      return () => {
        active = false;
      };
    }
  }, [fixedStudent]);

  useEffect(() => {
    if (isEditing || !selectedStudentId) return;
    let active = true;
    getSupabaseBrowserClient()
      .from("meetings")
      .select("meeting_number")
      .eq("student_id", selectedStudentId)
      .order("meeting_number", { ascending: false })
      .limit(1)
      .then(({ data, error: fetchError }) => {
        if (!active || fetchError) return;
        const numbers = ((data ?? []) as { meeting_number: number }[]).map(
          (row) => row.meeting_number,
        );
        setAutoNumber(
          (numbers.length > 0 ? Math.max(...numbers) : 0) + 1,
        );
      });
    return () => {
      active = false;
    };
  }, [isEditing, selectedStudentId]);

  function handleStudentChange(studentId: string) {
    setSelectedStudentId(studentId);
    if (!isEditing) {
      setMeetingNumber("");
      void fetchNextNumber(studentId);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudentId) {
      setError("Wybierz ucznia.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let number = meetingNumber
        ? Number.parseInt(meetingNumber, 10)
        : autoNumber;
      if (!meetingNumber && !number) {
        const { data, error: maxError } = await getSupabaseBrowserClient()
          .from("meetings")
          .select("meeting_number")
          .eq("student_id", selectedStudentId)
          .order("meeting_number", { ascending: false })
          .limit(1);
        if (maxError) throw maxError;
        const numbers = ((data ?? []) as { meeting_number: number }[]).map(
          (row) => row.meeting_number,
        );
        number = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
      }

      if (!number || Number.isNaN(number)) {
        setError("Podaj poprawny numer spotkania.");
        return;
      }

      const payload = {
        student_id: selectedStudentId,
        meeting_number: number,
        meeting_date: date,
        meeting_time: time,
        meeting_url: url.trim() || null,
        instructions: instructions.trim() || null,
        notes: notes.trim() || null,
      };

      let result;
      if (meeting) {
        result = await getSupabaseBrowserClient()
          .from("meetings")
          .update(payload)
          .eq("id", meeting.id)
          .select()
          .single();
      } else {
        result = await getSupabaseBrowserClient()
          .from("meetings")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      onSaved(String((result.data as { id: string }).id));
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Nie udało się zapisać spotkania. Sprawdź, czy numer spotkania nie jest już zajęty.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {isEditing ? "Edytuj spotkanie" : "Nowe spotkanie"}
      </h1>

      <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
        {fixedStudent ? (
          <Field label="Uczeń">
            <div className="h-10 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm leading-10 text-zinc-700">
              {studentFullName(fixedStudent)}
            </div>
          </Field>
        ) : (
          <Field
            label="Uczeń"
            htmlFor="meeting-student"
            hint="Kolejny numer zostanie zaproponowany automatycznie."
          >
            <Select
              id="meeting-student"
              value={selectedStudentId}
              onChange={(event) => handleStudentChange(event.target.value)}
              required
              disabled={saving}
            >
              <option value="">Wybierz ucznia…</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {studentFullName(student)}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Numer spotkania"
            htmlFor="meeting-number"
            hint={
              meetingNumber === "" && autoNumber
                ? `Zostanie użyte #${autoNumber}`
                : "Puste = kolejny numer"
            }
          >
            <Input
              id="meeting-number"
              type="number"
              min={1}
              value={meetingNumber}
              onChange={(event) => setMeetingNumber(event.target.value)}
              disabled={saving || isEditing}
              placeholder={autoNumber ? String(autoNumber) : "Auto"}
            />
          </Field>
          <Field label="Data" htmlFor="meeting-date">
            <Input
              id="meeting-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              disabled={saving}
            />
          </Field>
          <Field label="Godzina" htmlFor="meeting-time">
            <Input
              id="meeting-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
              disabled={saving}
            />
          </Field>
        </div>

        <Field
          label="Link do spotkania online"
          htmlFor="meeting-url"
          hint="Opcjonalnie, np. Google Meet, Zoom lub Teams."
        >
          <Input
            id="meeting-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            disabled={saving}
          />
        </Field>

        <Field
          label="Instrukcje"
          htmlFor="meeting-instructions"
          hint="Co uczeń ma zrobić przed spotkaniem lub czego dotyczy spotkanie."
        >
          <Textarea
            id="meeting-instructions"
            rows={5}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Na dzisiejszym spotkaniu przejdziemy przez zadania dotyczące Past Simple. Przed zajęciami przeczytaj materiały poniżej."
            disabled={saving}
          />
        </Field>

        <Field
          label="Notatka dla ucznia"
          htmlFor="meeting-notes"
          hint="Opcjonalnie – pojawi się na stronie spotkania ucznia."
        >
          <Textarea
            id="meeting-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={saving}
          />
        </Field>

        {error ? <ErrorNote>{error}</ErrorNote> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !selectedStudentId}>
            {saving
              ? "Zapisywanie…"
              : isEditing
                ? "Zapisz spotkanie"
                : "Utwórz spotkanie"}
          </Button>
          {isEditing ? null : null}
        </div>
      </form>
    </Card>
  );
}
