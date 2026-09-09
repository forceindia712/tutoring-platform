import type { Metadata } from "next";
import { MeetingDetails } from "@/components/student/MeetingDetails";
import { StudentMessage } from "@/components/student/StudentMessage";
import {
  addFileUrls,
  findStudentByToken,
  getMaterialsForMeeting,
  getMeetingForStudent,
} from "@/lib/data/student";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spotkanie",
};

export default async function StudentMeetingPage({
  params,
}: {
  params: Promise<{ token: string; meetingId: string }>;
}) {
  const { token, meetingId } = await params;
  let student: Awaited<ReturnType<typeof findStudentByToken>> = null;
  let meeting: Awaited<ReturnType<typeof getMeetingForStudent>> = null;
  let materials: Awaited<ReturnType<typeof getMaterialsForMeeting>> = [];
  let fetchFailed = false;

  if (!/^[a-zA-Z0-9]{6,40}$/.test(token)) {
    return (
      <StudentMessage
        title="Nieprawidłowy link"
        message="Poproś nauczyciela o nowy link."
      />
    );
  }

  try {
    student = await findStudentByToken(token);
    meeting = student
      ? await getMeetingForStudent(student.id, meetingId)
      : null;
    materials = meeting
      ? await addFileUrls(await getMaterialsForMeeting(meeting.id))
      : [];
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    return (
      <StudentMessage
        title="Coś poszło nie tak"
        message="Nie udało się pobrać spotkania. Spróbuj ponownie za chwilę."
      />
    );
  }

  if (!student) {
    return (
      <StudentMessage
        title="Nie znaleziono ucznia"
        message="Sprawdź link lub skontaktuj się z nauczycielem."
      />
    );
  }

  if (!meeting) {
    return (
      <StudentMessage
        title="Nie znaleziono spotkania"
        message="To spotkanie nie istnieje albo nie jest przypisane do Ciebie."
      />
    );
  }

  return (
    <MeetingDetails
      studentToken={token}
      meeting={meeting}
      materials={materials}
    />
  );
}
