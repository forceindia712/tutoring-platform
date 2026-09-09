import type { Metadata } from "next";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { StudentMessage } from "@/components/student/StudentMessage";
import {
  findStudentByToken,
  getStudentMeetings,
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
    meetings = student ? await getStudentMeetings(student.id) : [];
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
    />
  );
}
