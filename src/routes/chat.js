import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireTokens } from "../middleware/requireTokens.js";
import { debitTokens } from "../services/tokenService.js";
import { runPlannerAgent } from "../agents/plannerAgent.js";
import { runReviewerAgent } from "../agents/reviewerAgent.js";
import { logger } from "../lib/logger.js";

export const chatRouter = Router();

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

    await debitTokens({
      tenantId,
      userId: req.user.id,
      amount: 1,
      description: `chat: ${message.slice(0, 80)}`,
    });

    logger.info("chat_complete", {
      tenantId,
      toolsUsed: toolResults.map((t) => t.tool),
      tokensDebited: 1,
    });

    res.json({ response: finalResponse, toolsUsed: toolResults.map((t) => t.tool) });
  } catch (err) {
    next(err);
  }
});
