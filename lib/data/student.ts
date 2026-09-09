import "server-only";

import { MATERIAL_BUCKET } from "@/lib/constants";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import type { Material, Meeting, StudentSummary } from "@/lib/types";

export async function findStudentByToken(token: string): Promise<StudentSummary | null> {
  const { data, error } = await getSupabaseServiceClient()
    .from("students")
    .select("id, first_name, last_name")
    .eq("student_access_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się pobrać ucznia: ${error.message}`);
  }
  return data;
}

export async function getStudentMeetings(studentId: string): Promise<Meeting[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("meetings")
    .select("*")
    .eq("student_id", studentId)
    .order("meeting_date", { ascending: false })
    .order("meeting_time", { ascending: false });

  if (error) {
    throw new Error(`Nie udało się pobrać spotkań: ${error.message}`);
  }
  return (data ?? []) as Meeting[];
}

export async function getMeetingForStudent(
  studentId: string,
  meetingId: string,
): Promise<Meeting | null> {
  const { data, error } = await getSupabaseServiceClient()
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się pobrać spotkania: ${error.message}`);
  }
  return data;
}

export async function getMaterialsForMeeting(meetingId: string): Promise<Material[]> {
  const { data, error } = await getSupabaseServiceClient()
    .from("materials")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Nie udało się pobrać materiałów: ${error.message}`);
  }
  return (data ?? []) as Material[];
}

export type MaterialWithFileUrl = Material & { download_url?: string | null };

export async function addFileUrls(
  materials: Material[],
): Promise<MaterialWithFileUrl[]> {
  const filePaths = materials
    .filter((material) => material.type === "file" && material.file_url)
    .map((material) => material.file_url as string);

  if (filePaths.length === 0) {
    return materials as MaterialWithFileUrl[];
  }

  const { data, error } = await getSupabaseServiceClient()
    .storage.from(MATERIAL_BUCKET)
    .createSignedUrls(filePaths, 60 * 60 * 6);

  if (error) {
    throw new Error(`Nie udało się przygotować plików: ${error.message}`);
  }

  const urlByPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      urlByPath.set(item.path, item.signedUrl);
    }
  }

  return materials.map((material) => {
    const filePath = material.file_url;
    return {
      ...material,
      download_url:
        material.type === "file" && filePath
          ? (urlByPath.get(filePath) ?? null)
          : null,
    };
  });
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}
