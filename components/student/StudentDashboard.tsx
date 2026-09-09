"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState, Input, Select } from "@/components/ui";
import { MeetingCard } from "@/components/student/MeetingCard";
import {
  currentSchoolYear,
  isMeetingUpcoming,
  schoolYearForDate,
} from "@/lib/format";
import type { Material, Meeting, StudentInfo } from "@/lib/types";

type StudentDashboardProps = {
  studentToken: string;
  firstName: string;
  meetings: Meeting[];
  infos: StudentInfo[];
  materials: Material[];
};

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function StudentDashboard({
  studentToken,
  firstName,
  meetings,
  infos,
  materials,
}: StudentDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setMounted(true);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const availableYears = Array.from(
    new Set([
      currentSchoolYear(),
      ...meetings.map((meeting) => schoolYearForDate(meeting.meeting_date)),
    ]),
  ).sort((a, b) => b.localeCompare(a));

  const meetingsInYear = meetings.filter(
    (meeting) => schoolYearForDate(meeting.meeting_date) === schoolYear,
  );

  const terms = normalizeSearchText(query.trim())
    .split(/\s+/)
    .filter(Boolean);
  const isSearching = terms.length > 0;

  const searchResults = meetingsInYear.filter((meeting) => {
    const meetingText = normalizeSearchText(
      [meeting.instructions, meeting.notes, meeting.meeting_location]
        .filter(Boolean)
        .join(" "),
    );
    const meetingMaterials = materials.filter(
      (material) => material.meeting_id === meeting.id,
    );
    const materialsText = normalizeSearchText(
      meetingMaterials
        .flatMap((material) => [material.title, material.description])
        .filter(Boolean)
        .join(" "),
    );
    const haystack = `${meetingText} ${materialsText}`;
    return terms.every((term) => haystack.includes(term));
  });

  const sortedSearchResults = [...searchResults].sort((a, b) => {
    const left = `${a.meeting_date}T${a.meeting_time}`;
    const right = `${b.meeting_date}T${b.meeting_time}`;
    const compared = left.localeCompare(right);
    return order === "desc" ? compared * -1 : compared;
  });

  const upcoming = meetingsInYear
    .filter((meeting) => isMeetingUpcoming(meeting))
    .sort((a, b) =>
      `${a.meeting_date}T${a.meeting_time}`.localeCompare(
        `${b.meeting_date}T${b.meeting_time}`,
      ),
    );

  const past = meetingsInYear
    .filter((meeting) => !isMeetingUpcoming(meeting))
    .sort((a, b) =>
      `${b.meeting_date}T${b.meeting_time}`.localeCompare(
        `${a.meeting_date}T${a.meeting_time}`,
      ),
    );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Cześć, {firstName} 👋
      </h1>

      {infos.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Informacje od nauczyciela
          </h2>
          <div className="mt-3 space-y-3">
            {infos.map((info) => (
              <Card key={info.id} className="p-5 sm:p-6">
                <h3 className="font-semibold text-zinc-900">{info.title}</h3>
                {info.content ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                    {info.content}
                  </p>
                ) : null}
                {info.url ? (
                  <a
                    href={info.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
                  >
                    {info.url_label ?? "Otwórz link"}
                  </a>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            Twoje spotkania
          </h2>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            Rok szkolny
            <Select
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
              className="w-44"
              aria-label="Rok szkolny"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj lekcji, np. ułamki, Past Simple…"
            aria-label="Szukaj lekcji"
          />
        </div>

        {isSearching ? (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">
                {sortedSearchResults.length === 1
                  ? "1 znalezione spotkanie"
                  : `${sortedSearchResults.length} znalezionych spotkań`}
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

            {sortedSearchResults.length === 0 ? (
              <div className="mt-4">
                <EmptyState>
                  Brak spotkań pasujących do „{query.trim()}”.
                </EmptyState>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {sortedSearchResults.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    studentToken={studentToken}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!isSearching ? (
          <div className="mt-5">
            {mounted && meetingsInYear.length === 0 ? (
              <div className="mt-4">
                <EmptyState>
                  {meetings.length === 0
                    ? "Nie masz jeszcze żadnych spotkań."
                    : `Brak spotkań w roku szkolnym ${schoolYear}.`}
                </EmptyState>
              </div>
            ) : null}

            {mounted && upcoming.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Nadchodzące spotkania
                </h3>
                <div className="mt-3 space-y-3">
                  {upcoming.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      studentToken={studentToken}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {mounted && past.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Wcześniejsze spotkania
                </h3>
                <div className="mt-3 space-y-3">
                  {past.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      studentToken={studentToken}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
