import type { StudentSummary } from "@/lib/types";

export function studentFullName(student: {
  first_name: string;
  last_name: string;
}): string {
  return `${student.first_name} ${student.last_name}`;
}

export function toStudentSummary(value: unknown): StudentSummary | null {
  if (!value || typeof value !== "object") return null;
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;
  const row = candidate as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.first_name !== "string") {
    return null;
  }
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: String(row.last_name ?? ""),
  };
}

export function apiErrorMessage(
  error: unknown,
  fallback = "Nie udało się wykonać operacji. Spróbuj ponownie.",
): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message) return message;
  }
  return fallback;
}

export function todayDateInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
