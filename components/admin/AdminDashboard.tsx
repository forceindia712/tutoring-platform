"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, ErrorNote, Select } from "@/components/ui";
import { LessonSearch } from "@/components/admin/LessonSearch";
import {
  listAllMaterials,
  listAllMeetings,
  listStudents,
} from "@/lib/firebase/clientDb";
import { studentFullName } from "@/lib/admin";
import {
  currentSchoolYear,
  dayLabel,
  formatTime,
  schoolYearForDate,
} from "@/lib/format";
import type { Material, Meeting, Student } from "@/lib/types";

function studentById(students: Student[], id: string): Student | undefined {
  return students.find((student) => student.id === id);
}

export function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());

  useEffect(() => {
    let active = true;
    Promise.all([listStudents(), listAllMeetings(), listAllMaterials()])
      .then(([studentsResult, meetingsResult, materialsResult]) => {
        if (!active) return;
        setStudents(studentsResult);
        setMeetings(meetingsResult);
        setMaterials(materialsResult);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się pobrać danych panelu.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (loading) {
    return <p className="text-sm text-zinc-500">Wczytywanie panelu…</p>;
  }

  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayKey = `${today.getFullYear()}-${month}-${day}`;

  const availableYears = Array.from(
    new Set([
      currentSchoolYear(),
      ...meetings.map((meeting) => schoolYearForDate(meeting.meeting_date)),
    ]),
  ).sort((a, b) => b.localeCompare(a));

  const meetingsInYear = meetings.filter(
    (meeting) => schoolYearForDate(meeting.meeting_date) === schoolYear,
  );
  const meetingsInYearIds = new Set(meetingsInYear.map((meeting) => meeting.id));
  const materialsInYear = materials.filter((material) =>
    meetingsInYearIds.has(material.meeting_id),
  );

  const upcomingMeetings = meetingsInYear
    .filter((meeting) => meeting.meeting_date >= todayKey)
    .sort((a, b) =>
      `${a.meeting_date}T${a.meeting_time}`.localeCompare(
        `${b.meeting_date}T${b.meeting_time}`,
      ),
    )
    .slice(0, 8);

  const recentMaterials = [...materialsInYear]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);

  const groupedUpcoming = new Map<string, Meeting[]>();
  for (const meeting of upcomingMeetings) {
    const group = groupedUpcoming.get(meeting.meeting_date) ?? [];
    group.push(meeting);
    groupedUpcoming.set(meeting.meeting_date, group);
  }

  const materialLabel = (type: string) =>
    type === "file"
      ? "Plik"
      : type === "link"
        ? "Link"
        : type === "assignment"
          ? "Zadanie"
          : type === "text"
            ? "Tekst"
            : "Notatka";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Panel nauczyciela
      </h1>
      <p className="mt-1 text-sm text-zinc-600">
        Szybki przegląd uczniów i najbliższych spotkań.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Rok szkolny
          <Select
            value={schoolYear}
            onChange={(event) => setSchoolYear(event.target.value)}
            className="w-44"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-600">Uczniowie</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {students.length}
          </p>
          <Link
            href="/admin/students"
            className="mt-3 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
          >
            Zarządzaj uczniami
          </Link>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-600">
            Nadchodzące spotkania
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {meetingsInYear.filter((meeting) => meeting.meeting_date >= todayKey).length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-600">Materiały</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {materialsInYear.length}
          </p>
          <Link
            href="/admin/meetings/new"
            className="mt-3 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
          >
            Dodaj spotkanie
          </Link>
        </Card>
      </div>

      <LessonSearch
        meetings={meetingsInYear}
        students={students}
        materials={materialsInYear}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Najbliższe spotkania
        </h2>
        {upcomingMeetings.length === 0 ? (
          <Card className="mt-4 p-6 text-sm text-zinc-500">
            Brak nadchodzących spotkań.
          </Card>
        ) : (
          <div className="mt-4 space-y-5">
            {[...groupedUpcoming.entries()].map(([date, meetingsOnDay]) => (
              <div key={date}>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {dayLabel(date)}
                </p>
                <div className="mt-2 space-y-2">
                  {meetingsOnDay.map((meeting) => {
                    const student = studentById(students, meeting.student_id);
                    return (
                      <Link
                        key={meeting.id}
                        href={`/admin/meetings/${meeting.id}`}
                        className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium text-zinc-900">
                          {formatTime(meeting.meeting_time)}
                          <span className="mx-2 text-zinc-300">·</span>
                          {student ? studentFullName(student) : "Uczeń"}
                        </span>
                        <span className="text-sm text-zinc-500">
                          {!meeting.meeting_url ? "Stacjonarne · " : ""}
                          Spotkanie #{meeting.meeting_number}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Ostatnio dodane materiały
          </h2>
          <Link
            href="/admin/students"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            Zarządzaj uczniami →
          </Link>
        </div>
        {recentMaterials.length === 0 ? (
          <Card className="mt-4 p-6 text-sm text-zinc-500">
            Nie dodano jeszcze żadnych materiałów.
          </Card>
        ) : (
          <div className="mt-4 space-y-2">
            {recentMaterials.map((material) => {
              const meeting = meetings.find(
                (item) => item.id === material.meeting_id,
              );
              const student = meeting
                ? studentById(students, meeting.student_id)
                : undefined;
              return (
                <div
                  key={material.id}
                  className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-zinc-900">
                    {material.title}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {materialLabel(material.type)}
                    {student ? ` · ${studentFullName(student)}` : ""}
                    {meeting
                      ? ` · Spotkanie #${meeting.meeting_number}`
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/students"
          className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Przejdź do uczniów
        </Link>
        <Link
          href="/admin/meetings/new"
          className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
        >
          Utwórz spotkanie
        </Link>
      </div>
    </div>
  );
}
