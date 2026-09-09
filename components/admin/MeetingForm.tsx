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
import {
  createMeeting,
  listMeetingsForStudent,
  listStudentSummaries,
  updateMeeting,
} from "@/lib/firebase/clientDb";
import { studentFullName, todayDateInputValue } from "@/lib/admin";
import type { Meeting, Student } from "@/lib/types";

type MeetingFormProps = {
  fixedStudent?: Pick<Student, "id" | "first_name" | "last_name"> | null;
  meeting?: Meeting | null;
  onSaved: (meetingId: string) => void;
};

type MeetingMode = "online" | "stacjonarne";

export function MeetingForm({
  fixedStudent,
  meeting,
  onSaved,
}: MeetingFormProps) {
  const isEditing = Boolean(meeting);
  const [students, setStudents] = useState<
    Array<Pick<Student, "id" | "first_name" | "last_name">>
  >([]);
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
  const [time, setTime] = useState(
    meeting?.meeting_time.slice(0, 5) ?? "17:00",
  );
  const [mode, setMode] = useState<MeetingMode>(
    meeting?.meeting_url ? "online" : "stacjonarne",
  );
  const [url, setUrl] = useState(meeting?.meeting_url ?? "");
  const [location, setLocation] = useState(
    meeting?.meeting_location ?? "",
  );
  const [instructions, setInstructions] = useState(
    meeting?.instructions ?? "",
  );
  const [notes, setNotes] = useState(meeting?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fixedStudent) return;
    let active = true;
    listStudentSummaries()
      .then((data) => {
        if (active) setStudents(data);
      })
      .catch(() => {
        if (active) setError("Nie udało się pobrać uczniów.");
      });
    return () => {
      active = false;
    };
  }, [fixedStudent]);

  useEffect(() => {
    if (isEditing || !selectedStudentId) return;
    let active = true;
    listMeetingsForStudent(selectedStudentId)
      .then((data) => {
        if (!active) return;
        const numbers = data.map((item) => item.meeting_number);
        setAutoNumber(
          (numbers.length > 0 ? Math.max(...numbers) : 0) + 1,
        );
      })
      .catch(() => {
        if (active) setError("Nie udało się ustalić numeru spotkania.");
      });
    return () => {
      active = false;
    };
  }, [isEditing, selectedStudentId]);

  function handleStudentChange(studentId: string) {
    setSelectedStudentId(studentId);
    if (!isEditing) {
      setMeetingNumber("");
      setAutoNumber(null);
    }
  }

  function handleModeChange(nextMode: MeetingMode) {
    setMode(nextMode);
    if (nextMode === "stacjonarne") {
      setUrl("");
    } else {
      setLocation("");
    }
  }

  async function nextNumberFor(studentId: string): Promise<number> {
    const data = await listMeetingsForStudent(studentId);
    const numbers = data.map((item) => item.meeting_number);
    return (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudentId) {
      setError("Wybierz ucznia.");
      return;
    }

    if (mode === "online" && !url.trim()) {
      setError("Podaj link do spotkania online.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const number = meetingNumber
        ? Number.parseInt(meetingNumber, 10)
        : autoNumber ?? (await nextNumberFor(selectedStudentId));
      if (!number || Number.isNaN(number)) {
        setError("Podaj poprawny numer spotkania.");
        return;
      }

      const payload = {
        student_id: selectedStudentId,
        meeting_number: number,
        meeting_date: date,
        meeting_time: time,
        meeting_url: mode === "online" ? url.trim() : null,
        meeting_location:
          mode === "stacjonarne" ? location.trim() || null : null,
        instructions: instructions.trim() || null,
        notes: notes.trim() || null,
      };

      if (meeting) {
        await updateMeeting(meeting.id, payload);
        onSaved(meeting.id);
      } else {
        const createdId = await createMeeting(payload);
        onSaved(createdId);
      }
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Nie udało się zapisać spotkania.",
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

        <Field label="Rodzaj spotkania" htmlFor="meeting-mode">
          <Select
            id="meeting-mode"
            value={mode}
            onChange={(event) =>
              handleModeChange(event.target.value as MeetingMode)
            }
            disabled={saving}
          >
            <option value="online">Spotkanie online</option>
            <option value="stacjonarne">Spotkanie stacjonarne</option>
          </Select>
        </Field>

        {mode === "online" ? (
          <Field
            label="Link do spotkania online"
            htmlFor="meeting-url"
            hint="np. Google Meet, Zoom lub Teams"
          >
            <Input
              id="meeting-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              required
              disabled={saving}
            />
          </Field>
        ) : (
          <Field
            label="Miejsce spotkania"
            htmlFor="meeting-location"
            hint="Opcjonalnie – np. adres, szkoła, kawiarnia."
          >
            <Input
              id="meeting-location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="np. ul. Polna 5, Warszawa"
              disabled={saving}
            />
          </Field>
        )}

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
        </div>
      </form>
    </Card>
  );
}
