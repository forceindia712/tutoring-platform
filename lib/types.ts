export type MaterialType = "link" | "file" | "text" | "assignment" | "note";

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  notes: string | null;
  student_access_token: string;
  created_at: string;
};

export type Meeting = {
  id: string;
  student_id: string;
  meeting_number: number;
  meeting_date: string;
  meeting_time: string;
  meeting_url: string | null;
  instructions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Material = {
  id: string;
  meeting_id: string;
  type: MaterialType;
  title: string;
  description: string | null;
  url: string | null;
  sort_order: number;
  created_at: string;
};

export type StudentSummary = Pick<Student, "id" | "first_name" | "last_name">;

export type MeetingWithStudent = Meeting & {
  student?: StudentSummary | StudentSummary[] | null;
};
