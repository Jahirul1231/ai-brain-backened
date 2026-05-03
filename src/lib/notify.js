import { getSupabase } from "./supabase.js";
import { logger } from "./logger.js";

export const notify = async ({ type, title, body, link }) => {
  try {
    await getSupabase().from("notifications").insert({ type, title, body, link });
  } catch (err) {
    logger.warn("notify_failed", { type, error: err.message });
  }
};

export const logActivity = async ({ action, entity, entityId, meta }) => {
  try {
    await getSupabase().from("activity_log").insert({ action, entity, entity_id: entityId, meta });
  } catch (err) {
    logger.warn("activity_log_failed", { action, error: err.message });
  }
};
