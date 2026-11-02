import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { hydrateFromFirestore } from "@/lib/firebase/convert";
import { studentFullName } from "@/lib/admin";
import { normalizePolishPhone } from "@/lib/notifications/phone";
import {
  buildEmail,
  buildSmsText,
  type EmailContent,
  type Homework,
  type MessageContext,
} from "@/lib/notifications/templates";
import type {
  Material,
  Meeting,
  NotificationAudience,
  NotificationChannel,
  Student,
} from "@/lib/types";

export type PreparedNotification = {
  meeting: Meeting;
  student: Student;
  recipient: string | null; // znormalizowany e-mail lub numer; null = brak danych
  link: string;
  homework: Homework | null;
  email: EmailContent | null;
  smsText: string | null;
};

export function homeworkFromMaterials(materials: Material[]): Homework | null {
  // Pracą domową jest wyłącznie materiał typu „Praca domowa”.
  const assignments = materials.filter((item) => item.type === "homework");
  if (assignments.length === 0) return null;
  // Najwcześniejszy termin (data + godzina; brak godziny = początek dnia).
  const dated = assignments
    .filter((item) => Boolean(item.due_date))
    .sort((a, b) =>
      `${a.due_date}T${a.due_time ?? "00:00"}`.localeCompare(
        `${b.due_date}T${b.due_time ?? "00:00"}`,
      ),
    );
  const first = dated[0];
  return {
    titles: assignments.map((item) => item.title),
    dueDate: first?.due_date ?? null,
    dueTime: first?.due_time?.slice(0, 5) ?? null,
    links: assignments
      .filter((item) => Boolean(item.url))
      .map((item) => ({ title: item.title, url: item.url as string })),
  };
}

function recipientFor(
  student: Student,
  channel: NotificationChannel,
  audience: NotificationAudience,
): string | null {
  if (channel === "email") {
    const raw = audience === "student" ? student.email : student.parent_email;
    const value = raw?.trim().toLowerCase() ?? "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  }
  const raw = audience === "student" ? student.phone : student.parent_phone;
  return normalizePolishPhone(raw);
}

// Zawsze buduje wiadomość z AKTUALNEGO stanu spotkania i odbiorcę z bazy.
// Nic z tego nie pochodzi od klienta poza identyfikatorem spotkania.
export async function prepareNotification(
  meetingId: string,
  channel: NotificationChannel,
  audience: NotificationAudience,
  baseUrl: string,
): Promise<PreparedNotification | null> {
  const db = getAdminFirestore();
  const meetingSnap = await db.collection("meetings").doc(meetingId).get();
  if (!meetingSnap.exists) return null;
  const meeting = hydrateFromFirestore<Meeting>(meetingSnap);

  const studentSnap = await db
    .collection("students")
    .doc(meeting.student_id)
    .get();
  if (!studentSnap.exists) return null;
  const student = hydrateFromFirestore<Student>(studentSnap);

  const materialsSnap = await db
    .collection("materials")
    .where("meeting_id", "==", meetingId)
    .get();
  const materials = materialsSnap.docs.map((item) =>
    hydrateFromFirestore<Material>(item),
  );

  const homework = homeworkFromMaterials(materials);
  const link = `${baseUrl}/s/${student.student_access_token}/meeting/${meeting.id}`;
  const ctx: MessageContext = {
    audience,
    studentFirstName: student.first_name,
    studentFullName: studentFullName(student),
    parentName: student.parent_name?.trim() || null,
    meetingDate: meeting.meeting_date,
    homework,
    link,
  };

  return {
    meeting,
    student,
    recipient: recipientFor(student, channel, audience),
    link,
    homework,
    email: channel === "email" ? buildEmail(ctx) : null,
    smsText: channel === "sms" ? buildSmsText(ctx) : null,
  };
}
