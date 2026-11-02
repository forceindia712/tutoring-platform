import "server-only";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type LookupResponse = {
  users?: Array<{ email?: string; emailVerified?: boolean }>;
};

// Sprawdza Firebase ID token z nagłówka Authorization przez Identity Toolkit
// (Google weryfikuje podpis i ważność tokenu) i porównuje e-mail z kontem
// nauczyciela (TEACHER_EMAIL). Bez firebase-admin/auth, żeby nie ładować
// dodatkowych modułów do każdej funkcji serwerowej.
export async function requireTeacher(request: Request): Promise<void> {
  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!teacherEmail || !apiKey) {
    throw new AuthError(
      "Brak konfiguracji serwera (TEACHER_EMAIL lub klucz Firebase).",
      500,
    );
  }
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw new AuthError("Brak autoryzacji.", 401);

  let data: LookupResponse;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: match[1] }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      throw new AuthError("Sesja wygasła. Zaloguj się ponownie.", 401);
    }
    data = (await response.json()) as LookupResponse;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Nie udało się zweryfikować sesji. Spróbuj ponownie.", 503);
  }

  const user = data.users?.[0];
  const email = user?.email?.toLowerCase();
  // Tak samo jak firestore.rules: liczy się adres konta, bez emailVerified
  // (konta e-mail/hasło zwykle nie mają potwierdzonego adresu).
  if (!email || email !== teacherEmail) {
    throw new AuthError("Brak uprawnień.", 403);
  }
}
