import { getClaude, CLAUDE_MODEL } from "../lib/claude.js";
import {
  readSheet,
  writeSheet,
  updateRange,
  appendToSheet,
  createSheet,
  listSheets,
} from "../services/sheetsService.js";

const SYSTEM_PROMPT = `You are an expert data analyst AI. You help users read, write, and analyze data in Google Sheets.

When the user asks a question or gives an instruction about their data:
1. Understand their intent
2. Use the appropriate sheet tool to fulfill the request
3. Be precise with ranges (e.g., Sheet1!A1:D10)
4. Never modify data unless the user explicitly asks you to write, update, or append

Always use tools to access real data before answering.`;

const TOOLS = [
  {
    name: "list_sheets",
    description: "List all sheet tabs in a spreadsheet. Use this first to understand the structure.",
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
    description: "Read data from a specific range in a sheet. Use this to answer questions about the data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Range in A1 notation, e.g. Sheet1!A1:D10 or Sheet1!A:Z for all data" },
      },
      required: ["spreadsheetId", "range"],
    },
  },
  {
    name: "write_sheet",
    description: "Write/overwrite data to a specific range. Only use when user explicitly asks to write or update data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Range in A1 notation" },
        values: { type: "array", items: { type: "array" }, description: "2D array of values to write" },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "append_to_sheet",
    description: "Append new rows to a sheet. Only use when user explicitly asks to add or append data.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The Google Spreadsheet ID" },
        range: { type: "string", description: "Range to append to, e.g. Sheet1!A:Z" },
        values: { type: "array", items: { type: "array" }, description: "2D array of rows to append" },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "update_range",
    description: "Update a specific cell range with new values. Only use when user explicitly asks to update data.",
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
    description: "Create a new sheet tab. Only use when user explicitly asks to create a new sheet.",
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
    case "list_sheets":    return listSheets({ tenantId, ...input });
    case "read_sheet":     return readSheet({ tenantId, ...input });
    case "write_sheet":    return writeSheet({ tenantId, ...input });
    case "append_to_sheet": return appendToSheet({ tenantId, ...input });
    case "update_range":   return updateRange({ tenantId, ...input });
    case "create_sheet":   return createSheet({ tenantId, ...input });
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
};

export const runPlannerAgent = async ({ message, spreadsheetId, tenantId }) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      response: "AI features are not yet active. The Anthropic API key has not been configured. Everything else is ready — once the key is added, I'll be fully live.",
      toolResults: [],
      messages: [],
    };
  }
  const claude = getClaude();
  const messages = [
    {
      role: "user",
      content: spreadsheetId
        ? `Spreadsheet ID: ${spreadsheetId}\n\n${message}`
        : message,
    },
  ];

  const toolResults = [];
  let finalResponse = "";

  // Agentic loop — max 5 iterations to prevent runaway
  for (let i = 0; i < 5; i++) {
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
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
