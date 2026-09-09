"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, EmptyState, Input, Select } from "@/components/ui";
import { studentFullName } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import type { Material, Meeting, Student } from "@/lib/types";

type LessonSearchProps = {
  meetings: Meeting[];
  students: Student[];
  materials: Material[];
};

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function LessonSearch({
  meetings,
  students,
  materials,
}: LessonSearchProps) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const studentById = new Map(
    students.map((student) => [student.id, student] as const),
  );
  const materialsByMeeting = new Map<string, Material[]>();
  for (const material of materials) {
    const list = materialsByMeeting.get(material.meeting_id) ?? [];
    list.push(material);
    materialsByMeeting.set(material.meeting_id, list);
  }

  const terms = normalizeSearchText(query.trim())
    .split(/\s+/)
    .filter(Boolean);

  const results = meetings
    .filter((meeting) => {
      if (terms.length === 0) return false;

      const meetingText = normalizeSearchText(
        [meeting.instructions, meeting.notes, meeting.meeting_location]
          .filter(Boolean)
          .join(" "),
      );
      const meetingMaterials = materialsByMeeting.get(meeting.id) ?? [];
      const materialsText = normalizeSearchText(
        meetingMaterials
          .flatMap((material) => [material.title, material.description])
          .filter(Boolean)
          .join(" "),
      );
      const haystack = `${meetingText} ${materialsText}`;
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
      const left = `${a.meeting_date}T${a.meeting_time}`;
      const right = `${b.meeting_date}T${b.meeting_time}`;
      const compared = left.localeCompare(right);
      return order === "desc" ? compared * -1 : compared;
    });

  const hasQuery = query.trim().length > 0;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-zinc-900">
        Szukaj lekcji
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Znajdź spotkanie po instrukcjach, notatkach albo materiałach.
      </p>

      <div className="mt-4">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="np. ułamki, Past Simple, zadanie domowe…"
          aria-label="Szukaj lekcji"
        />
      </div>

      {!hasQuery ? (
        <Card className="mt-5 p-5 text-sm text-zinc-500">
          Wpisz temat albo fragment instrukcji, notatki lub materiału – np.
          „ułamki”.
        </Card>
      ) : null}

      {hasQuery ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {results.length === 1
                ? "1 znalezione spotkanie"
                : `${results.length} znalezionych spotkań`}
            </p>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Sortowanie
              <Select
                value={order}
                onChange={(event) =>
                  setOrder(event.target.value as "desc" | "asc")
                }
                className="w-44"
                aria-label="Sortowanie wyników"
              >
                <option value="desc">Od najnowszych</option>
                <option value="asc">Od najstarszych</option>
              </Select>
            </label>
          </div>

          {results.length === 0 ? (
            <div className="mt-4">
              <EmptyState>
                Brak spotkań pasujących do „{query.trim()}”.
              </EmptyState>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {results.map((meeting) => {
                const student = studentById.get(meeting.student_id);
                const meetingMaterials =
                  materialsByMeeting.get(meeting.id) ?? [];

                return (
                  <Link
                    key={meeting.id}
                    href={`/admin/meetings/${meeting.id}`}
                    className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-zinc-900">
                        {student ? studentFullName(student) : "Uczeń"}
                        <span className="mx-2 font-normal text-zinc-300">
                          ·
                        </span>
                        Spotkanie #{meeting.meeting_number}
                      </span>
                      <span className="mt-0.5 block text-sm text-zinc-500">
                        {formatDateTime(
                          meeting.meeting_date,
                          meeting.meeting_time,
                        )}
                        {!meeting.meeting_url
                          ? " · Stacjonarne"
                          : ""}
                        {meeting.meeting_location
                          ? ` · ${meeting.meeting_location}`
                          : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-zinc-400">
                      {meetingMaterials.length > 0
                        ? `${meetingMaterials.length} materiałów`
                        : "Brak materiałów"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
