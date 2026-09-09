"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Card,
  ErrorNote,
} from "@/components/ui";
import { toStudentSummary } from "@/lib/admin";
import { dayLabel, formatTime } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { MeetingWithStudent } from "@/lib/types";

type RecentMaterial = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  meeting:
    | {
        id: string;
        meeting_number: number;
        student?: unknown;
      }[]
    | {
        id: string;
        meeting_number: number;
        student?: unknown;
      }
    | null;
};

function firstRow(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export function AdminDashboard() {
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);
  const [materialsCount, setMaterialsCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<MeetingWithStudent[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<RecentMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayKey = `${today.getFullYear()}-${month}-${day}`;

    async function load() {
      const client = getSupabaseBrowserClient();
      const [students, upcomingRes, materialsRes, upcomingMeetings, latestMaterials] =
        await Promise.all([
          client.from("students").select("*", { count: "exact", head: true }),
          client
            .from("meetings")
            .select("*", { count: "exact", head: true })
            .gte("meeting_date", todayKey),
          client
            .from("materials")
            .select("*", { count: "exact", head: true }),
          client
            .from("meetings")
            .select(
              "id, meeting_number, meeting_date, meeting_time, meeting_url, instructions, notes, created_at, updated_at, student_id, student:students(id, first_name, last_name)",
            )
            .gte("meeting_date", todayKey)
            .order("meeting_date", { ascending: true })
            .order("meeting_time", { ascending: true })
            .limit(8),
          client
            .from("materials")
            .select(
              "id, title, type, created_at, meeting:meetings(id, meeting_number, student:students(id, first_name, last_name))",
            )
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

      if (
        students.error ||
        upcomingRes.error ||
        materialsRes.error ||
        upcomingMeetings.error ||
        latestMaterials.error
      ) {
        setError("Nie udało się pobrać danych panelu.");
      } else {
        setStudentsCount(students.count ?? 0);
        setUpcomingCount(upcomingRes.count ?? 0);
        setMaterialsCount(materialsRes.count ?? 0);
        setUpcoming((upcomingMeetings.data ?? []) as MeetingWithStudent[]);
        setRecentMaterials(
          (latestMaterials.data ?? []) as unknown as RecentMaterial[],
        );
      }
      if (active) setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (loading) {
    return <p className="text-sm text-zinc-500">Wczytywanie panelu…</p>;
  }

  const groupedUpcoming = new Map<string, MeetingWithStudent[]>();
  for (const meeting of upcoming) {
    const key = meeting.meeting_date;
    groupedUpcoming.set(key, [...(groupedUpcoming.get(key) ?? []), meeting]);
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-600">Uczniowie</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {studentsCount}
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
            {upcomingCount}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-600">Materiały</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {materialsCount}
          </p>
          <Link
            href="/admin/meetings/new"
            className="mt-3 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
          >
            Dodaj spotkanie
          </Link>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Najbliższe spotkania
        </h2>
        {upcoming.length === 0 ? (
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
                    const student = toStudentSummary(meeting.student);
                    return (
                      <Link
                        key={meeting.id}
                        href={`/admin/meetings/${meeting.id}`}
                        className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-medium text-zinc-900">
                          {formatTime(meeting.meeting_time)}
                          <span className="mx-2 text-zinc-300">·</span>
                          {student
                            ? `${student.first_name} ${student.last_name}`
                            : "Uczeń"}
                        </span>
                        <span className="text-sm text-zinc-500">
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
              const meetingRow = firstRow(material.meeting);
              const student = toStudentSummary(meetingRow?.student);
              const name = student
                ? `${student.first_name} ${student.last_name}`
                : "";
              const meeting = meetingRow as {
                meeting_number?: number;
              } | null;
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
                    {name ? ` · ${name}` : ""}
                    {meeting ? ` · Spotkanie #${meeting.meeting_number}` : ""}
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
