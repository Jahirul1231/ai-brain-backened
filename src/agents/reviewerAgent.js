import { getClaude, CLAUDE_MODEL } from "../lib/claude.js";
import { getGroq, GROQ_MODEL } from "../lib/groq.js";
import { env } from "../config/env.js";

const SYSTEM_PROMPT = `You are a senior data analyst presenting findings to a business executive. Your job is to turn raw analysis into a clean, professional response.

Format rules:
- Lead immediately with the direct answer — no preamble
- Use markdown tables for tabular data (columns aligned, headers in bold)
- Use bullet points for lists of insights or findings
- Use **bold** for key numbers, names, and important values
- Add a brief "Key Takeaways" section at the end for complex analyses
- Keep it concise — no filler, no restating the question
- If data was written to a sheet, confirm the sheet name, tab name, and row count
- If an error occurred, explain it in one plain sentence and suggest the fix`;

export const runReviewerAgent = async ({ userMessage, plannerResponse, toolResults = [] }) => {
  if (!plannerResponse && toolResults.length === 0) {
    return "I wasn't able to retrieve any data. Please check that your Google Sheet is connected and try again.";
  }

  const useGroq = !env.claude.apiKey && env.groq.apiKey;
  const useClaude = !!env.claude.apiKey;

  if (!useClaude && !useGroq) {
    return plannerResponse || "";
  }

  const toolSummary =
    toolResults.length > 0
      ? toolResults
          .map((t) => {
            const resultStr = t.error
              ? `ERROR: ${t.error}`
              : JSON.stringify(t.result).slice(0, 800);
            return `• ${t.tool}(${JSON.stringify(t.input).slice(0, 200)})\n  → ${resultStr}`;
          })
          .join("\n\n")
      : "(no tool calls)";

  const userContent = `User asked: ${userMessage}

Analyst's response: ${plannerResponse}

Data accessed:
${toolSummary}

Produce the final clean response for the user. Format it professionally with tables or bullets where appropriate.`;

  if (useClaude) {
    const claude = getClaude();
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text || plannerResponse || "";
  }

  // Groq fallback
  const groq = getGroq();
  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 2048,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });
  return response.choices[0]?.message?.content || plannerResponse || "";
};
