import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import { hydrateFromFirestore } from "@/lib/firebase/convert";
import type {
  Material,
  Meeting,
  StudentInfo,
  StudentSummary,
} from "@/lib/types";

export async function findStudentByToken(
  token: string,
): Promise<StudentSummary | null> {
  const snapshot = await getAdminFirestore()
    .collection("students")
    .where("student_access_token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const data = snapshot.docs[0].data();
  return {
    id: snapshot.docs[0].id,
    first_name: String(data.first_name ?? ""),
    last_name: String(data.last_name ?? ""),
  };
}

export async function getStudentMeetings(
  studentId: string,
): Promise<Meeting[]> {
  const snapshot = await getAdminFirestore()
    .collection("meetings")
    .where("student_id", "==", studentId)
    .get();

  return snapshot.docs
    .map((meetingSnapshot) =>
      hydrateFromFirestore<Meeting>(meetingSnapshot),
    )
    .sort((a, b) =>
      `${b.meeting_date}T${b.meeting_time}`.localeCompare(
        `${a.meeting_date}T${a.meeting_time}`,
      ),
    );
}

export async function getMeetingForStudent(
  studentId: string,
  meetingId: string,
): Promise<Meeting | null> {
  const snapshot = await getAdminFirestore()
    .collection("meetings")
    .doc(meetingId)
    .get();

  if (!snapshot.exists) return null;
  const meeting = hydrateFromFirestore<Meeting>(snapshot);
  return meeting.student_id === studentId ? meeting : null;
}

export async function getMaterialsForMeeting(
  meetingId: string,
): Promise<Material[]> {
  const snapshot = await getAdminFirestore()
    .collection("materials")
    .where("meeting_id", "==", meetingId)
    .get();

  return snapshot.docs
    .map((materialSnapshot) =>
      hydrateFromFirestore<Material>(materialSnapshot),
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getStudentInfos(
  studentId: string,
): Promise<StudentInfo[]> {
  const snapshot = await getAdminFirestore()
    .collection("student_infos")
    .where("student_id", "==", studentId)
    .get();

  return snapshot.docs
    .map((infoSnapshot) => hydrateFromFirestore<StudentInfo>(infoSnapshot))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export { normalizeName, normalizedFullName } from "@/lib/names";
