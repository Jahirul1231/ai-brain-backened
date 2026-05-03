import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireTokens } from "../middleware/requireTokens.js";
import { debitTokens } from "../services/tokenService.js";
import { runPlannerAgent } from "../agents/plannerAgent.js";
import { runReviewerAgent } from "../agents/reviewerAgent.js";
import { getSupabase } from "../lib/supabase.js";
import { notify, logActivity } from "../lib/notify.js";
import { logger } from "../lib/logger.js";

export const chatRouter = Router();

chatRouter.get("/chat/history", authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const { data, error } = await getSupabase()
      .from("chat_history")
      .select("id, message, response, tools_used, tokens_used, created_at")
      .eq("tenant_id", req.tenant.id)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { next(err); }
});

chatRouter.post("/chat", authenticate, requireTokens(1), async (req, res, next) => {
  try {
    const { message, spreadsheetId } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const tenantId = req.tenant.id;

    const { response: plannerResponse, toolResults } = await runPlannerAgent({
      message,
      spreadsheetId,
      tenantId,
    });

    const finalResponse = await runReviewerAgent({
      userMessage: message,
      plannerResponse,
      toolResults,
    });

    const toolsUsed = toolResults.map((t) => t.tool);

    await Promise.all([
      debitTokens({
        tenantId,
        userId: req.user.id,
        amount: 1,
        description: `chat: ${message.slice(0, 80)}`,
      }),
      getSupabase().from("chat_history").insert({
        tenant_id: tenantId,
        user_id: req.user.id,
        message,
        response: finalResponse,
        tools_used: toolsUsed,
        tokens_used: 1,
      }),
    ]);

    logger.info("chat_complete", { tenantId, toolsUsed, tokensDebited: 1 });

    // Check remaining balance and warn if low
    const { data: bal } = await getSupabase().from("token_balances").select("balance").eq("tenant_id", tenantId).single();
    const remaining = bal?.balance ?? 0;

    if (remaining === 5) {
      notify({ type: "low_tokens", title: "Low token balance", body: `Tenant ${tenantId} has only ${remaining} tokens remaining`, link: `/dashboard/tenants` }).catch(() => null);
    }

    logActivity({ action: "chat", entity: "tenant", entityId: tenantId, meta: { toolsUsed } }).catch(() => null);

    res.json({ response: finalResponse, toolsUsed, tokensRemaining: remaining });
  } catch (err) {
    next(err);
  }
});
