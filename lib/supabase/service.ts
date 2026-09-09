import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/config";

let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!serviceRoleKey) {
      throw new Error(
        "Brak SUPABASE_SERVICE_ROLE_KEY. To zmienna serwerowa – dodaj ją w Vercel (Environment Variables) i w .env.local.",
      );
    }
    serviceClient = createClient(getSupabaseUrl(), serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}
