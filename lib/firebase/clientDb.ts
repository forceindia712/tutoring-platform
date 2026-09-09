import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import {
  getFirebaseStorageClient,
  getFirestoreClient,
} from "@/lib/firebase/client";
import { hydrateFromFirestore } from "@/lib/firebase/convert";
import { normalizedFullName } from "@/lib/names";
import { STORAGE_MATERIALS_PREFIX } from "@/lib/constants";
import { generateAccessToken } from "@/lib/token";
import type { Material, Meeting, Student } from "@/lib/types";

function db() {
  return getFirestoreClient();
}

function hydrate<T>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  return hydrateFromFirestore<T>(snapshot);
}

export type StudentInput = {
  first_name: string;
  last_name: string;
  email: string | null;
  notes: string | null;
};

export async function listStudents(): Promise<Student[]> {
  const snapshot = await getDocs(collection(db(), "students"));
  return snapshot.docs.map((item) => hydrate<Student>(item));
}

export async function getStudent(studentId: string): Promise<Student | null> {
  const snapshot = await getDoc(doc(db(), "students", studentId));
  return snapshot.exists() ? hydrate<Student>(snapshot) : null;
}

export async function createStudent(input: StudentInput): Promise<Student> {
  const accessToken = generateAccessToken();
  const createdRef = await addDoc(collection(db(), "students"), {
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    notes: input.notes,
    student_access_token: accessToken,
    search_name: normalizedFullName(input.first_name, input.last_name),
    created_at: serverTimestamp(),
  });
  return {
    id: createdRef.id,
    ...input,
    student_access_token: accessToken,
    created_at: new Date().toISOString(),
  };
}

export async function updateStudent(
  studentId: string,
  input: StudentInput,
): Promise<void> {
  await updateDoc(doc(db(), "students", studentId), {
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    notes: input.notes,
    search_name: normalizedFullName(input.first_name, input.last_name),
  });
}

export async function deleteStudent(studentId: string): Promise<void> {
  const meetingsSnapshot = await getDocs(
    query(
      collection(db(), "meetings"),
      where("student_id", "==", studentId),
    ),
  );

  for (const meetingSnapshot of meetingsSnapshot.docs) {
    const materialsSnapshot = await getDocs(
      query(
        collection(db(), "materials"),
        where("meeting_id", "==", meetingSnapshot.id),
      ),
    );
    for (const materialSnapshot of materialsSnapshot.docs) {
      await deleteDoc(doc(db(), "materials", materialSnapshot.id));
    }
    await deleteDoc(doc(db(), "meetings", meetingSnapshot.id));
  }

  await deleteDoc(doc(db(), "students", studentId));
}

export async function listStudentSummaries(): Promise<
  Array<Pick<Student, "id" | "first_name" | "last_name">>
> {
  const students = await listStudents();
  return students.map(({ id, first_name, last_name }) => ({
    id,
    first_name,
    last_name,
  }));
}

export type MeetingInput = {
  student_id: string;
  meeting_number: number;
  meeting_date: string;
  meeting_time: string;
  meeting_url: string | null;
  instructions: string | null;
  notes: string | null;
};

async function meetingsOfStudent(studentId: string): Promise<Meeting[]> {
  const snapshot = await getDocs(
    query(collection(db(), "meetings"), where("student_id", "==", studentId)),
  );
  return snapshot.docs.map((item) => hydrate<Meeting>(item));
}

export async function meetingNumberExists(
  studentId: string,
  number: number,
  excludeMeetingId?: string,
): Promise<boolean> {
  const meetings = await meetingsOfStudent(studentId);
  return meetings.some(
    (meeting) =>
      meeting.meeting_number === number && meeting.id !== excludeMeetingId,
  );
}

export async function createMeeting(input: MeetingInput): Promise<string> {
  if (await meetingNumberExists(input.student_id, input.meeting_number)) {
    throw new Error("Ten numer spotkania jest już zajęty dla tego ucznia.");
  }
  const createdRef = await addDoc(collection(db(), "meetings"), {
    ...input,
    created_at: serverTimestamp(),
  });
  return createdRef.id;
}

export async function updateMeeting(
  meetingId: string,
  input: MeetingInput,
): Promise<void> {
  if (
    await meetingNumberExists(
      input.student_id,
      input.meeting_number,
      meetingId,
    )
  ) {
    throw new Error("Ten numer spotkania jest już zajęty dla tego ucznia.");
  }
  await updateDoc(doc(db(), "meetings", meetingId), {
    ...input,
    updated_at: serverTimestamp(),
  });
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const snapshot = await getDoc(doc(db(), "meetings", meetingId));
  return snapshot.exists() ? hydrate<Meeting>(snapshot) : null;
}

export async function listMeetingsForStudent(
  studentId: string,
): Promise<Meeting[]> {
  const meetings = await meetingsOfStudent(studentId);
  return meetings.sort((a, b) =>
    `${b.meeting_date}T${b.meeting_time}`.localeCompare(
      `${a.meeting_date}T${a.meeting_time}`,
    ),
  );
}

export async function listAllMeetings(): Promise<Meeting[]> {
  const snapshot = await getDocs(collection(db(), "meetings"));
  return snapshot.docs.map((item) => hydrate<Meeting>(item));
}

export async function listMaterialsForMeeting(
  meetingId: string,
): Promise<Material[]> {
  const snapshot = await getDocs(
    query(collection(db(), "materials"), where("meeting_id", "==", meetingId)),
  );
  return snapshot.docs
    .map((item) => hydrate<Material>(item))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function listAllMaterials(): Promise<Material[]> {
  const snapshot = await getDocs(collection(db(), "materials"));
  return snapshot.docs.map((item) => hydrate<Material>(item));
}

export type MaterialInput = {
  type: Material["type"];
  title: string;
  description: string | null;
  url: string | null;
  file_url: string | null;
  file_path?: string | null;
  sort_order: number;
};

export async function createMaterial(
  meetingId: string,
  input: MaterialInput,
): Promise<void> {
  await addDoc(collection(db(), "materials"), {
    meeting_id: meetingId,
    ...input,
    created_at: serverTimestamp(),
  });
}

export async function updateMaterial(
  materialId: string,
  input: MaterialInput,
): Promise<void> {
  const updates: Record<string, unknown> = { ...input };
  if (!input.file_url) updates.file_url = deleteField();
  if (!input.file_path) updates.file_path = deleteField();
  await updateDoc(doc(db(), "materials", materialId), updates);
}

export async function deleteMaterial(materialId: string): Promise<void> {
  await deleteDoc(doc(db(), "materials", materialId));
}

export async function moveMaterial(
  materialId: string,
  nextSortOrder: number,
): Promise<void> {
  await updateDoc(doc(db(), "materials", materialId), {
    sort_order: nextSortOrder,
  });
}

export async function uploadMaterialFile(
  meetingId: string,
  file: File,
): Promise<{ downloadUrl: string; path: string }> {
  const id =
    (typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function" &&
      crypto.randomUUID()) ||
    `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const safeName =
    file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "plik";
  const path = `${STORAGE_MATERIALS_PREFIX}/${meetingId}/${id}-${safeName}`;
  const storageRef = ref(getFirebaseStorageClient(), path);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });
  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl, path };
}

export async function removeStorageFile(path: string): Promise<void> {
  await deleteObject(ref(getFirebaseStorageClient(), path));
}
