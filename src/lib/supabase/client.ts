import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors/app-error";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new AppError("Supabase environment variables are missing.", 500, {
      missing: {
        NEXT_PUBLIC_SUPABASE_URL: !supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY_OR_SUPABASE_ANON_KEY: !supabaseKey
      }
    });
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });

  return cachedClient;
}
