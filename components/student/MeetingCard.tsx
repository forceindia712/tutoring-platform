import Link from "next/link";
import { buttonClassName, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Meeting } from "@/lib/types";

type MeetingCardProps = {
  meeting: Meeting;
  studentToken: string;
  statusLabel?: string | null;
};

export function MeetingCard({
  meeting,
  studentToken,
  statusLabel,
}: MeetingCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-zinc-900">
          Spotkanie #{meeting.meeting_number}
        </p>
        {statusLabel ? (
          <p className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {statusLabel}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-zinc-600">
          {formatDateTime(meeting.meeting_date, meeting.meeting_time)}
        </p>
        {!meeting.meeting_url ? (
          <p className="mt-1 text-sm text-zinc-500">
            Spotkanie stacjonarne
            {meeting.meeting_location ? ` · ${meeting.meeting_location}` : ""}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {meeting.meeting_url ? (
          <a
            href={meeting.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName("secondary", "sm")}
          >
            Dołącz do spotkania
          </a>
        ) : null}
        <Link
          href={`/s/${studentToken}/meeting/${meeting.id}`}
          className={buttonClassName("primary", "sm")}
        >
          Otwórz spotkanie
        </Link>
      </div>
    </Card>
  );
}
