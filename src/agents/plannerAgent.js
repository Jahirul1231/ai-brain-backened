import { getClaude } from "../lib/claude.js";
import {
  readSheet,
  writeSheet,
  updateRange,
  appendToSheet,
  createSheet,
  listSheets,
  getSpreadsheetInfo,
} from "../services/sheetsService.js";

const PLANNER_MODEL = "claude-opus-4-7";
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

const TOOLS = [
  {
    name: "get_spreadsheet_info",
    description:
      "Get the spreadsheet title and list all sheet tabs with their dimensions. Use this first to understand the structure before reading data.",
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
    description:
      "Read data from a specific range in a sheet. Use A1 notation like 'Sheet1!A1:F50' or 'Sales!A:Z' for all columns in a tab. Always include the sheet tab name in the range.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: {
          type: "string",
          description: "Range in A1 notation with tab name, e.g. 'Sheet1!A1:E100' or 'Inventory!A:F'",
        },
      },
      required: ["spreadsheetId", "range"],
    },
  },
  {
    name: "write_sheet",
    description:
      "Write data to a range, overwriting existing content. Use only when the user explicitly asks to write or set data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Range in A1 notation, e.g. 'Dashboard!A1:D20'" },
        values: {
          type: "array",
          items: { type: "array" },
          description: "2D array of values to write (outer array = rows, inner array = columns)",
        },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "append_to_sheet",
    description:
      "Append new rows to the end of a sheet. Use only when the user asks to add or append data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Sheet range to append after, e.g. 'Sheet1!A:Z'" },
        values: {
          type: "array",
          items: { type: "array" },
          description: "2D array of rows to append",
        },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "update_range",
    description:
      "Update specific cells in a range with new values. Use only when user explicitly asks to update or edit specific data.",
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
    description:
      "Create a new sheet tab in a spreadsheet. Use this when creating a dashboard, summary, or output sheet.",
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

export const runPlannerAgent = async ({
  tenantId,
  message,
  spreadsheetId,
  sheetIds = [],
  spreadsheetMeta = [],
}) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      response:
        "AI features are not yet active. The Anthropic API key has not been configured. Everything else is ready — once the key is added, I'll be fully live.",
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

  const claude = getClaude();
  const systemPrompt = buildSystemPrompt(availableSheets);

  // Attach spreadsheet context to the user message
  let userContent = message;
  if (availableSheets.length > 0) {
    const ctx = availableSheets
      .map((s) => `- "${s.name}" → spreadsheetId: ${s.id}`)
      .join("\n");
    userContent = `Connected spreadsheets:\n${ctx}\n\nUser request: ${message}`;
  }

  const messages = [{ role: "user", content: userContent }];
  const toolResults = [];
  let finalResponse = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await claude.messages.create({
      model: PLANNER_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
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
          results.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: JSON.stringify(data),
          });
        } catch (err) {
          toolResults.push({ tool: tool.name, input: tool.input, error: err.message });
          results.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: `Error: ${err.message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: results });
    }
  }

  return { response: finalResponse, toolResults, messages };
};
