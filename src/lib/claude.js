import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";

let client = null;

export const getClaude = () => {
  if (client) return client;
  if (!env.claude.apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  client = new Anthropic({ apiKey: env.claude.apiKey });
  return client;
};

export const CLAUDE_MODEL = env.claude.model;
