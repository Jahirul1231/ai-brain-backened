import Groq from "groq-sdk";
import { env } from "../config/env.js";

let client = null;

export const getGroq = () => {
  if (client) return client;
  if (!env.groq.apiKey) throw new Error("GROQ_API_KEY not configured");
  client = new Groq({ apiKey: env.groq.apiKey });
  return client;
};

export const GROQ_MODEL = "llama-3.3-70b-versatile";
