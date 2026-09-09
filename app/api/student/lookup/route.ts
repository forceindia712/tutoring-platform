import { NextRequest, NextResponse } from "next/server";
import { normalizeName } from "@/lib/data/student";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

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

  const normalizedInput = normalizeName(`${words[0]} ${words[words.length - 1]}`);

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("students")
      .select("first_name, last_name, student_access_token");

    if (error) {
      console.error("Student lookup error:", error.message);
      return NextResponse.json(
        {
          ok: false,
          message:
            "Nie znaleziono ucznia. Sprawdź wpisane dane lub skontaktuj się z nauczycielem.",
        },
        { status: 200 },
      );
    }

    const matches = (data ?? []).filter((row) => {
      const first = String(row.first_name ?? "");
      const last = String(row.last_name ?? "");
      return normalizeName(`${first} ${last}`) === normalizedInput;
    });

    if (matches.length === 1) {
      const token = String(matches[0].student_access_token);
      return NextResponse.json({
        ok: true,
        redirectTo: `/s/${token}`,
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
