import { google } from "googleapis";
import { env } from "../config/env.js";

export const createServiceAccountClient = () => {
  const { serviceAccountEmail: email, serviceAccountKey: key } = env.google;
  if (!email || !key) throw new Error("Service account not configured");
  // Normalise key — Railway may store \n as literal two chars or as actual newlines
  const privateKey = key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
  return new google.auth.JWT(
    email,
    null,
    privateKey,
    [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ]
  );
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
