import { getSupabase } from "./supabase.js";

export const postToChannel = async (slug, senderName, content, meta = {}, senderType = "agent") => {
  try {
    await getSupabase().from("agent_messages").insert({
      channel_slug: slug,
      sender_type: senderType,
      sender_name: senderName,
      content,
      meta,
    });
  } catch {
    // Never let channel posting break the primary flow
  }
};
