import type { Metadata } from "next";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { StudentMessage } from "@/components/student/StudentMessage";
import {
  findStudentByToken,
  getStudentInfos,
  getStudentMeetings,
  getMaterialsForMeeting,
} from "@/lib/data/student";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moje spotkania",
};

export default async function StudentPanelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let student: Awaited<ReturnType<typeof findStudentByToken>> = null;
  let meetings: Awaited<ReturnType<typeof getStudentMeetings>> = [];
  let infos: Awaited<ReturnType<typeof getStudentInfos>> = [];
  let materials: Awaited<ReturnType<typeof getMaterialsForMeeting>> = [];
  let fetchFailed = false;

  if (!/^[a-zA-Z0-9]{6,40}$/.test(token)) {
    return (
      <StudentMessage
        title="Nieprawidłowy link"
        message="Ten link wygląda na nieprawidłowy. Poproś nauczyciela o nowy link."
      />
    );
  }

  try {
    student = await findStudentByToken(token);
    if (student) {
      const [studentMeetings, studentInfos] = await Promise.all([
        getStudentMeetings(student.id),
        getStudentInfos(student.id),
      ]);
      meetings = studentMeetings;
      infos = studentInfos;
      materials = (
        await Promise.all(
          studentMeetings.map((meeting) =>
            getMaterialsForMeeting(meeting.id),
          ),
        )
      ).flat();
    }
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    return (
      <StudentMessage
        title="Coś poszło nie tak"
        message="Nie udało się pobrać spotkań. Spróbuj ponownie za chwilę."
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

  return (
    <StudentDashboard
      studentToken={token}
      firstName={student.first_name}
      meetings={meetings}
      infos={infos}
      materials={materials}
    />
  );
}
