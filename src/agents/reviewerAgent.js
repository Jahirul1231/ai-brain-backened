import { getClaude, CLAUDE_MODEL } from "../lib/claude.js";

const SYSTEM_PROMPT = `You are a concise data analyst presenting results to a business user.

Given the raw tool results and the planner's analysis, produce a clean, human-readable response:
- Lead with the direct answer to the user's question
- Use bullet points or a table when presenting data
- Keep it short — no unnecessary preamble or filler
- If data was modified, confirm exactly what changed
- If an error occurred, explain it plainly and suggest a fix`;

export const runReviewerAgent = async ({ userMessage, plannerResponse, toolResults }) => {
  if (!plannerResponse && toolResults.length === 0) {
    return "I wasn't able to retrieve any data. Please check the spreadsheet ID and try again.";
  }

  const claude = getClaude();

  const content = `User asked: ${userMessage}

Planner's response: ${plannerResponse}

Tool calls made:
${toolResults.map((t) => `- ${t.tool}(${JSON.stringify(t.input)})\n  Result: ${JSON.stringify(t.result)}`).join("\n")}

Please produce the final clean response for the user.`;

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || plannerResponse;
};
