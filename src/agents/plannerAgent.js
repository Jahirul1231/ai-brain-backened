import { getClaude } from "../lib/claude.js";
import { getGroq, GROQ_MODEL } from "../lib/groq.js";
import { env } from "../config/env.js";
import {
  readSheet,
  writeSheet,
  updateRange,
  appendToSheet,
  createSheet,
  listSheets,
  getSpreadsheetInfo,
} from "../services/sheetsService.js";

const CLAUDE_MODEL = "claude-opus-4-7";
const MAX_ITERATIONS = 15;

const buildSystemPrompt = (availableSheets) => {
  const sheetList =
    availableSheets.length > 0
      ? availableSheets.map((s, i) => `  ${i + 1}. "${s.name}" (ID: ${s.id})`).join("\n")
      : "  (No sheets connected — ask the user to connect a Google Sheet first)";

  return `You are a senior data analyst AI with full access to the user's Google Sheets. You work exactly like a real office data analyst — methodical, precise, and business-focused.

## Available Spreadsheets
${sheetList}

## Your Workflow
1. **Explore first**: Use get_spreadsheet_info or list_sheets to understand the sheet structure before reading data.
2. **Read smart**: Use specific ranges like "Sales!A1:F100" rather than reading entire sheets unnecessarily.
3. **Multi-sheet analysis**: When the task spans multiple sheets, read each one, combine/compare the data in your reasoning, then produce unified output.
4. **Dashboard creation**: Create a new sheet tab → write structured data with bold headers, computed totals, key metrics, and clear sections.
5. **Be thorough on complex tasks**: Plan your steps — gather all needed data first, then analyze, then write results.

## Dashboard & Report Format
When creating a dashboard or summary sheet, structure it like a real analyst would:
- Row 1: Dashboard title (e.g., "MONTHLY DASHBOARD — May 2026")
- Row 2: Generation date
- Row 3: Blank separator
- Section headers in CAPS (e.g., "KEY METRICS", "SALES SUMMARY", "TOP PERFORMERS")
- Data tables with clear column headers
- Totals/averages row at the bottom of each table
- Blank rows between sections

## Rules
- Always use tools to access real data — never guess or hallucinate numbers
- Only write/modify data when the user explicitly asks you to (words like "create", "write", "update", "add")
- For read-only questions, just read and answer — don't touch the sheet
- After creating or writing to a sheet, confirm exactly what was created and where
- If a tool call fails, explain the error clearly and suggest the fix
- Handle plain English naturally — "show me revenue by month" means read the data and summarize it`;
};

// Claude-format tools (input_schema)
const CLAUDE_TOOLS = [
  {
    name: "get_spreadsheet_info",
    description: "Get the spreadsheet title and list all sheet tabs with their dimensions. Use this first to understand the structure before reading data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
      },
      required: ["spreadsheetId"],
    },
  },
  {
    name: "list_sheets",
    description: "List all sheet tabs in a spreadsheet with row and column counts.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
      },
      required: ["spreadsheetId"],
    },
  },
  {
    name: "read_sheet",
    description: "Read data from a specific range in a sheet. Use A1 notation like 'Sheet1!A1:F50' or 'Sales!A:Z' for all columns. Always include the sheet tab name.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Range in A1 notation with tab name, e.g. 'Sheet1!A1:E100'" },
      },
      required: ["spreadsheetId", "range"],
    },
  },
  {
    name: "write_sheet",
    description: "Write data to a range, overwriting existing content. Use only when user explicitly asks to write or set data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Range in A1 notation, e.g. 'Dashboard!A1:D20'" },
        values: { type: "array", items: { type: "array" }, description: "2D array of values to write (rows × columns)" },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "append_to_sheet",
    description: "Append new rows to the end of a sheet. Use only when the user asks to add or append data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Sheet range to append after, e.g. 'Sheet1!A:Z'" },
        values: { type: "array", items: { type: "array" }, description: "2D array of rows to append" },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "update_range",
    description: "Update specific cells in a range. Use only when user explicitly asks to update or edit specific data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Range in A1 notation" },
        values: { type: "array", items: { type: "array" }, description: "2D array of values" },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "create_sheet",
    description: "Create a new sheet tab in a spreadsheet. Use this when creating a dashboard or summary sheet.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        title: { type: "string", description: "Name for the new sheet tab" },
      },
      required: ["spreadsheetId", "title"],
    },
  },
];

// Groq-format tools (parameters instead of input_schema)
const GROQ_TOOLS = CLAUDE_TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

const executeTool = async (toolName, input, tenantId) => {
  switch (toolName) {
    case "get_spreadsheet_info": return getSpreadsheetInfo({ tenantId, ...input });
    case "list_sheets":          return listSheets({ tenantId, ...input });
    case "read_sheet":           return readSheet({ tenantId, ...input });
    case "write_sheet":          return writeSheet({ tenantId, ...input });
    case "append_to_sheet":      return appendToSheet({ tenantId, ...input });
    case "update_range":         return updateRange({ tenantId, ...input });
    case "create_sheet":         return createSheet({ tenantId, ...input });
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
};

// ─── Claude agentic loop ────────────────────────────────────────────────────
const runWithClaude = async ({ systemPrompt, userContent, tenantId }) => {
  const claude = getClaude();
  const messages = [{ role: "user", content: userContent }];
  const toolResults = [];
  let finalResponse = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      tools: CLAUDE_TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      finalResponse = textBlock?.text || "";
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const results = [];

      for (const tool of toolUses) {
        try {
          const data = await executeTool(tool.name, tool.input, tenantId);
          toolResults.push({ tool: tool.name, input: tool.input, result: data });
          results.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify(data) });
        } catch (err) {
          toolResults.push({ tool: tool.name, input: tool.input, error: err.message });
          results.push({ type: "tool_result", tool_use_id: tool.id, content: `Error: ${err.message}`, is_error: true });
        }
      }

      messages.push({ role: "user", content: results });
    }
  }

  return { response: finalResponse, toolResults };
};

// ─── Groq agentic loop ──────────────────────────────────────────────────────
const runWithGroq = async ({ systemPrompt, userContent, tenantId }) => {
  const groq = getGroq();
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
  const toolResults = [];
  let finalResponse = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 8000,
      tools: GROQ_TOOLS,
      tool_choice: "auto",
      messages,
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;
    messages.push(assistantMsg);

    if (choice.finish_reason === "stop" || !assistantMsg.tool_calls?.length) {
      finalResponse = assistantMsg.content || "";
      break;
    }

    if (choice.finish_reason === "tool_calls" || assistantMsg.tool_calls?.length) {
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;
        let input;
        try {
          input = JSON.parse(toolCall.function.arguments);
          const data = await executeTool(toolName, input, tenantId);
          toolResults.push({ tool: toolName, input, result: data });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(data),
          });
        } catch (err) {
          toolResults.push({ tool: toolName, input: input || {}, error: err.message });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `Error: ${err.message}`,
          });
        }
      }
    }
  }

  return { response: finalResponse, toolResults };
};

// ─── Main export ────────────────────────────────────────────────────────────
export const runPlannerAgent = async ({
  tenantId,
  message,
  spreadsheetId,
  sheetIds = [],
  spreadsheetMeta = [],
}) => {
  const useGroq = !env.claude.apiKey && env.groq.apiKey;
  const useClaude = !!env.claude.apiKey;

  if (!useClaude && !useGroq) {
    return {
      response:
        "AI features are not yet active. Please add ANTHROPIC_API_KEY or GROQ_API_KEY in Railway environment variables.",
      toolResults: [],
      messages: [],
    };
  }

  // Build the list of available sheets for context
  let availableSheets = spreadsheetMeta.filter((s) => s?.id);
  if (availableSheets.length === 0 && sheetIds.length > 0) {
    availableSheets = sheetIds.map((id) => ({ id, name: id }));
  } else if (availableSheets.length === 0 && spreadsheetId) {
    availableSheets = [{ id: spreadsheetId, name: spreadsheetId }];
  }

  const systemPrompt = buildSystemPrompt(availableSheets);

  let userContent = message;
  if (availableSheets.length > 0) {
    const ctx = availableSheets.map((s) => `- "${s.name}" → spreadsheetId: ${s.id}`).join("\n");
    userContent = `Connected spreadsheets:\n${ctx}\n\nUser request: ${message}`;
  }

  const runner = useClaude ? runWithClaude : runWithGroq;
  try {
    const { response, toolResults } = await runner({ systemPrompt, userContent, tenantId });
    return { response, toolResults, messages: [] };
  } catch (err) {
    // Surface a helpful error message instead of a raw 500
    const msg = err?.message || "";
    if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("Authentication")) {
      return {
        response: "AI error: The API key is invalid or has been revoked. Please update GROQ_API_KEY or ANTHROPIC_API_KEY in your Railway environment variables.",
        toolResults: [],
        messages: [],
      };
    }
    if (msg.includes("429") || msg.includes("rate_limit")) {
      return {
        response: "AI error: Rate limit reached. Please wait a moment and try again.",
        toolResults: [],
        messages: [],
      };
    }
    throw err;
  }
};
