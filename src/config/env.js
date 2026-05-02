import "dotenv/config";

const required = (key, { allowEmptyInDev = false } = {}) => {
  const v = process.env[key];
  if (v && v.length) return v;
  if (allowEmptyInDev && process.env.NODE_ENV !== "production") return "";
  throw new Error(`Missing required env var: ${key}`);
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  logLevel: process.env.LOG_LEVEL || "info",

  supabase: {
    url: required("SUPABASE_URL", { allowEmptyInDev: true }),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", { allowEmptyInDev: true }),
    jwtSecret: required("SUPABASE_JWT_SECRET", { allowEmptyInDev: true }),
  },

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
  },
};

export const isProd = env.nodeEnv === "production";
