export type MaterialType =
  | "link"
  | "file"
  | "text"
  | "assignment"
  | "homework"
  | "note";

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_email?: string | null;
  parent_phone?: string | null;
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
  meeting_location: string | null;
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
  due_date?: string | null;
  sort_order: number;
  created_at: string;
};

export type StudentInfo = {
  id: string;
  student_id: string;
  title: string;
  content: string | null;
  url: string | null;
  url_label: string | null;
  sort_order: number;
  created_at: string;
};

export type StudentSummary = Pick<Student, "id" | "first_name" | "last_name">;

export type MeetingWithStudent = Meeting & {
  student?: StudentSummary | StudentSummary[] | null;
};

export type NotificationChannel = "email" | "sms";
export type NotificationAudience = "student" | "parent";

// pending – wysyłka w toku; accepted – serwer SMTP przyjął wiadomość (to nie
// znaczy, że dotarła); manual – nauczyciel potwierdził ręczne wysłanie SMS-a;
// failed – błąd; unknown – wynik niepewny (np. timeout).
export type NotificationStatus =
  | "pending"
  | "accepted"
  | "manual"
  | "failed"
  | "unknown";

export type NotificationState = {
  id: string;
  meeting_id: string;
  student_id: string;
  channel: NotificationChannel;
  audience: NotificationAudience;
  send_count: number;
  last_sent_at: string | null;
  last_attempt_at?: string | null;
  last_status: NotificationStatus | null;
  last_recipient: string | null;
};

export type NotificationAttempt = {
  id: string;
  meeting_id: string;
  channel: NotificationChannel;
  audience: NotificationAudience;
  recipient: string;
  status: NotificationStatus;
  error: string | null;
  had_homework: boolean;
  is_resend: boolean;
  created_at: string;
};
