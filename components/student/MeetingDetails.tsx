import { BackLink, buttonClassName, Card, EmptyState } from "@/components/ui";
import { MaterialCard } from "@/components/student/MaterialCard";
import { formatDateTime } from "@/lib/format";
import type { Material, Meeting } from "@/lib/types";

type MeetingDetailsProps = {
  studentToken: string;
  meeting: Meeting;
  materials: Material[];
};

export function MeetingDetails({
  studentToken,
  meeting,
  materials,
}: MeetingDetailsProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <BackLink href={`/s/${studentToken}`}>Wróć do moich spotkań</BackLink>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Spotkanie #{meeting.meeting_number}
          </h1>
          <p className="mt-2 text-zinc-600">
            {formatDateTime(meeting.meeting_date, meeting.meeting_time)}
          </p>
        </div>
        {meeting.meeting_url ? (
          <a
            href={meeting.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName("primary", "md")}
          >
            Dołącz do spotkania
          </a>
        ) : null}
      </header>

      <div className="mt-10 space-y-10">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Instrukcje
          </h2>
          <div className="mt-3">
            <Card className="p-6">
              {meeting.instructions ? (
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">
                  {meeting.instructions}
                </p>
              ) : (
                <p className="text-sm text-zinc-500">
                  Nauczyciel nie dodał jeszcze instrukcji.
                </p>
              )}
            </Card>
          </div>
        </section>

        {meeting.notes ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Notatka od nauczyciela
            </h2>
            <div className="mt-3">
              <Card className="p-6">
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">
                  {meeting.notes}
                </p>
              </Card>
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Materiały
          </h2>
          {materials.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {materials.map((material, index) => (
                <li key={material.id}>
                  <MaterialCard material={material} index={index + 1} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-3">
              <EmptyState>
                Na razie nie ma materiałów do tego spotkania.
              </EmptyState>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
