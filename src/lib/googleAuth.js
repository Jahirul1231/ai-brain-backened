import { google } from "googleapis";
import { env } from "../config/env.js";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
];

export const createServiceAccountClient = () => {
  // Prefer full JSON credentials (most reliable — no key-format issues)
  if (env.google.serviceAccountJson) {
    try {
      const credentials = JSON.parse(env.google.serviceAccountJson);
      return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
  }
  // Fallback: email + private key
  const { serviceAccountEmail: email, serviceAccountKey: key } = env.google;
  if (!email || !key) throw new Error("Service account not configured");
  const privateKey = key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
  return new google.auth.GoogleAuth({
    credentials: { type: "service_account", client_email: email, private_key: privateKey },
    scopes: SCOPES,
  });
};

export const createOAuthClient = () =>
  new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );

export const getAuthUrl = () => {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });
};

export const getTokensFromCode = async (code) => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
};

export const createAuthedClient = (tokens) => {
  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
};
