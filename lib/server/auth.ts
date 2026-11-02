import "server-only";

import { getAdminAuth } from "@/lib/firebase/admin";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Sprawdza Firebase ID token z nagłówka Authorization i porównuje e-mail
// z kontem nauczyciela (TEACHER_EMAIL).
export async function requireTeacher(request: Request): Promise<void> {
  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  if (!teacherEmail) {
    throw new AuthError("Brak konfiguracji TEACHER_EMAIL na serwerze.", 500);
  }
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw new AuthError("Brak autoryzacji.", 401);

  let email: string | undefined;
  let verified: boolean | undefined;
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    email = decoded.email?.toLowerCase();
    verified = decoded.email_verified;
  } catch {
    throw new AuthError("Sesja wygasła. Zaloguj się ponownie.", 401);
  }
  if (!email || email !== teacherEmail || verified === false) {
    throw new AuthError("Brak uprawnień.", 403);
  }
}
