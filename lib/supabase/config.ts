export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_URL. Skopiuj .env.example do .env.local i uzupełnij dane z panelu Supabase.",
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!key) {
    throw new Error(
      "Brak NEXT_PUBLIC_SUPABASE_ANON_KEY. Skopiuj .env.example do .env.local i uzupełnij dane z panelu Supabase.",
    );
  }
  return key;
}
