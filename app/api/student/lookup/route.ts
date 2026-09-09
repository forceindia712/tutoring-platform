import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { normalizeName } from "@/lib/names";

export async function POST(request: NextRequest) {
  let body: { fullName?: unknown };
  try {
    body = (await request.json()) as { fullName?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, message: "Nieprawidłowe żądanie." },
      { status: 400 },
    );
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const words = fullName.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return NextResponse.json(
      { ok: false, message: "Podaj imię i nazwisko." },
      { status: 400 },
    );
  }

  const normalizedInput = normalizeName(
    `${words[0]} ${words[words.length - 1]}`,
  );

  try {
    const snapshot = await getAdminFirestore()
      .collection("students")
      .where("search_name", "==", normalizedInput)
      .get();

    const matches = snapshot.docs.map((item) => ({
      student_access_token: String(item.data().student_access_token ?? ""),
    }));

    if (matches.length === 1) {
      return NextResponse.json({
        ok: true,
        redirectTo: `/s/${matches[0].student_access_token}`,
      });
    }

    if (matches.length > 1) {
      return NextResponse.json({
        ok: false,
        message:
          "W bazie jest więcej niż jeden uczeń o tych danych. Skontaktuj się z nauczycielem.",
      });
    }

    return NextResponse.json({
      ok: false,
      message:
        "Nie znaleziono ucznia. Sprawdź wpisane dane lub skontaktuj się z nauczycielem.",
    });
  } catch (error) {
    console.error("Student lookup error:", error);
    return NextResponse.json(
      { ok: false, message: "Błąd serwera. Spróbuj ponownie później." },
      { status: 500 },
    );
  }
}
