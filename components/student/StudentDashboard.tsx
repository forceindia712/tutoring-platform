"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { MeetingCard } from "@/components/student/MeetingCard";
import { isMeetingUpcoming } from "@/lib/format";
import type { Meeting, StudentInfo } from "@/lib/types";

type StudentDashboardProps = {
  studentToken: string;
  firstName: string;
  meetings: Meeting[];
  infos: StudentInfo[];
};

export function StudentDashboard({
  studentToken,
  firstName,
  meetings,
  infos,
}: StudentDashboardProps) {
  const [mounted, setMounted] = useState(false);

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

  const upcoming = meetings
    .filter((meeting) => isMeetingUpcoming(meeting))
    .sort((a, b) =>
      `${a.meeting_date}T${a.meeting_time}`.localeCompare(
        `${b.meeting_date}T${b.meeting_time}`,
      ),
    );

  const past = meetings
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
        <h2 className="text-lg font-semibold text-zinc-900">Twoje spotkania</h2>

        {mounted && meetings.length === 0 ? (
          <div className="mt-4">
            <EmptyState>Nie masz jeszcze żadnych spotkań.</EmptyState>
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
      </section>
    </div>
  );
}
