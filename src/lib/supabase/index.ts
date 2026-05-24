import { logger } from "@/lib/errors/logger";
import { getSupabaseClient } from "./client";

type DatabaseConnectionResult = {
  ok: boolean;
  message: string;
};

export async function checkDatabaseConnection(): Promise<DatabaseConnectionResult> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("trade_records")
      .select("id", { head: true })
      .limit(1);

    if (error) {
      logger.error("Supabase health check query failed.", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      return {
        ok: false,
        message: "Supabase query failed."
      };
    }

    return {
      ok: true,
      message: "Supabase is reachable."
    };
  } catch (error) {
    logger.error("Supabase health check failed.", {
      error: error instanceof Error ? { name: error.name, message: error.message } : error
    });

    return {
      ok: false,
      message: "Supabase connection failed."
    };
  }
}

export { getSupabaseClient };
