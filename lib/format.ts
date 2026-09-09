import type { Meeting } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

export function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)}, ${formatTime(time)}`;
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatFullDateTime(date: string, time: string): string {
  return weekdayFormatter.format(new Date(`${date}T${time}`));
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function meetingDateKey(meeting: Pick<Meeting, "meeting_date">): string {
  return meeting.meeting_date;
}

export function isMeetingUpcoming(meeting: Pick<Meeting, "meeting_date" | "meeting_time">): boolean {
  const today = toLocalDateKey(new Date());
  if (meeting.meeting_date > today) return true;
  if (meeting.meeting_date < today) return false;

  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  return meeting.meeting_time.slice(0, 5) >= current;
}

export function dayLabel(date: string): string {
  const today = toLocalDateKey(new Date());
  if (date === today) return "Dzisiaj";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === toLocalDateKey(tomorrow)) return "Jutro";

  return formatDate(date);
}

export function schoolYearForDate(date: string): string {
  const [yearText, monthText] = date.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

export function currentSchoolYear(): string {
  return schoolYearForDate(toLocalDateKey(new Date()));
}
