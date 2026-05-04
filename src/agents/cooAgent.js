import { getClaude, CLAUDE_MODEL } from "../lib/claude.js";
import { getSupabase } from "../lib/supabase.js";

const SYSTEM_PROMPT = `You are the COO of Reportude AI, a B2B SaaS company that gives small businesses AI-powered data analytics via Google Sheets.

You manage a team of specialized agents and report directly to the Founder. Your job is to coordinate across all departments, surface what matters, and get things done.

Your agents and their domains:
- @onboarding  — client onboarding pipeline, stuck clients, step completion rates
- @support     — support tickets, open issues, client complaints, AI draft replies
- @ops         — system health, token balances, trial expirations, account statuses
- @sales       — trial conversions, new signups, revenue pipeline, at-risk accounts
- @data        — spreadsheet data, business metrics, trend analysis, anomalies
- @finance     — transactions, revenue, costs, financial health

When the Founder messages you:
1. Identify which departments are relevant to their question
2. Call the appropriate agent tools to gather real data
3. If the Founder uses @mentions (e.g. "@support what's open?"), prioritize that agent
4. Synthesize everything into a clear, actionable executive brief
5. Always lead with the most urgent items
6. Flag things that need the Founder's immediate decision or attention
7. Be direct and precise — you're a C-suite executive, not a generic assistant

Format: Use short paragraphs. Bold key numbers. When multiple agents report, use their names as section headers. End with "Action needed:" only if something genuinely requires the Founder's input.`;

const AGENT_TOOLS = [
  {
    name: "ask_onboarding_agent",
    description: "Query the Onboarding Agent for client onboarding status, stuck clients, completion rates, and pipeline health.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to ask the onboarding agent" },
      },
      required: ["query"],
    },
  },
  {
    name: "ask_support_agent",
    description: "Query the Support Agent for open tickets, unresolved issues, ticket volume, and client complaints.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to ask the support agent" },
      },
      required: ["query"],
    },
  },
  {
    name: "ask_ops_agent",
    description: "Query the OPS Agent for system health, token balances, trial expirations, and account statuses.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to ask the ops agent" },
      },
      required: ["query"],
    },
  },
  {
    name: "ask_sales_agent",
    description: "Query the Sales Agent for trial conversions, new signups, revenue pipeline, and at-risk accounts.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to ask the sales agent" },
      },
      required: ["query"],
    },
  },
  {
    name: "ask_data_agent",
    description: "Query the Data Agent for business metrics, analytics, trends, and data summaries.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to ask the data agent" },
      },
      required: ["query"],
    },
  },
  {
    name: "ask_finance_agent",
    description: "Query the Finance Agent for revenue, transactions, costs, and financial health.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to ask the finance agent" },
      },
      required: ["query"],
    },
  },
];

/* ── Sub-agent data fetchers ─────────────────────────────────── */

async function runOnboardingAgent(query) {
  const sb = getSupabase();
  const [{ data: progress }, { data: tenants }] = await Promise.all([
    sb.from("onboarding_progress")
      .select("step, completed, business_name, tenant_id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50),
    sb.from("tenants")
      .select("id, name, trial_active, trial_ends_at, account_status, created_at")
      .eq("account_status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const stuck = (progress || []).filter((p) => !p.completed && p.step < 3);
  const completed = (progress || []).filter((p) => p.completed).length;
  const total = (progress || []).length;
  const stepsBreakdown = [1, 2, 3, 4, 5].map((s) => ({
    step: s,
    count: (progress || []).filter((p) => p.step === s && !p.completed).length,
  }));

  return {
    agent: "Onboarding Agent",
    query,
    data: {
      total_clients: total,
      completed_onboarding: completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      stuck_clients: stuck.length,
      stuck_details: stuck.slice(0, 5).map((p) => ({ name: p.business_name, step: p.step, last_seen: p.updated_at })),
      steps_breakdown: stepsBreakdown,
      recent_tenants: (tenants || []).slice(0, 5).map((t) => ({ name: t.name, trial_active: t.trial_active, joined: t.created_at })),
    },
  };
}

async function runSupportAgent(query) {
  const sb = getSupabase();
  const { data: tickets } = await sb
    .from("support_tickets")
    .select("id, ticket_number, subject, status, priority, from_email, created_at, tenant_id, tenants(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  const open = (tickets || []).filter((t) => t.status === "open");
  const inProgress = (tickets || []).filter((t) => t.status === "in_progress");
  const urgent = (tickets || []).filter((t) => t.priority === "urgent" || t.priority === "high");

  return {
    agent: "Support Agent",
    query,
    data: {
      total_tickets: (tickets || []).length,
      open: open.length,
      in_progress: inProgress.length,
      urgent_or_high: urgent.length,
      open_tickets: open.slice(0, 5).map((t) => ({
        number: t.ticket_number,
        subject: t.subject,
        priority: t.priority,
        from: t.tenants?.name || t.from_email,
        age_hours: Math.round((Date.now() - new Date(t.created_at)) / 3600000),
      })),
      urgent_tickets: urgent.slice(0, 3).map((t) => ({
        number: t.ticket_number,
        subject: t.subject,
        priority: t.priority,
        client: t.tenants?.name || t.from_email,
      })),
    },
  };
}

async function runOpsAgent(query) {
  const sb = getSupabase();
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86400000).toISOString();

  const [{ data: tenants }, { data: lowTokens }, { data: expiringTrials }] = await Promise.all([
    sb.from("tenants")
      .select("id, name, account_status, trial_active, trial_ends_at")
      .order("created_at", { ascending: false }),
    sb.from("token_balances")
      .select("tenant_id, balance, tenants(name)")
      .lt("balance", 20)
      .order("balance"),
    sb.from("tenants")
      .select("id, name, trial_ends_at")
      .eq("trial_active", true)
      .lt("trial_ends_at", in3Days)
      .gt("trial_ends_at", now.toISOString()),
  ]);

  const active = (tenants || []).filter((t) => t.account_status === "active").length;
  const suspended = (tenants || []).filter((t) => t.account_status === "suspended").length;

  return {
    agent: "OPS Agent",
    query,
    data: {
      total_accounts: (tenants || []).length,
      active_accounts: active,
      suspended_accounts: suspended,
      low_token_accounts: (lowTokens || []).length,
      low_token_details: (lowTokens || []).slice(0, 5).map((t) => ({ name: t.tenants?.name, balance: t.balance })),
      trials_expiring_soon: (expiringTrials || []).length,
      expiring_details: (expiringTrials || []).map((t) => ({
        name: t.name,
        expires: t.trial_ends_at,
        days_left: Math.ceil((new Date(t.trial_ends_at) - now) / 86400000),
      })),
    },
  };
}

async function runSalesAgent(query) {
  const sb = getSupabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: allTenants }, { data: recentSignups }] = await Promise.all([
    sb.from("tenants")
      .select("id, name, plan, trial_active, trial_ends_at, account_status, created_at"),
    sb.from("tenants")
      .select("id, name, plan, trial_active, created_at")
      .gt("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
  ]);

  const onTrial = (allTenants || []).filter((t) => t.trial_active);
  const paidPlan = (allTenants || []).filter((t) => t.plan !== "free" && t.plan !== "starter");
  const newThis7Days = (recentSignups || []).filter((t) => t.created_at > sevenDaysAgo);
  const trialExpired = (allTenants || []).filter((t) => !t.trial_active && t.plan === "free");

  return {
    agent: "Sales Agent",
    query,
    data: {
      total_accounts: (allTenants || []).length,
      on_trial: onTrial.length,
      paid_accounts: paidPlan.length,
      free_no_trial: trialExpired.length,
      new_signups_7d: newThis7Days.length,
      new_signups_30d: (recentSignups || []).length,
      conversion_rate: (allTenants || []).length > 0
        ? Math.round((paidPlan.length / (allTenants || []).length) * 100)
        : 0,
      recent_signups: newThis7Days.slice(0, 5).map((t) => ({ name: t.name, joined: t.created_at })),
      at_risk: trialExpired.slice(0, 5).map((t) => ({ name: t.name, status: "trial expired, no conversion" })),
    },
  };
}

async function runDataAgent(query) {
  const sb = getSupabase();
  const [{ data: chats }, { data: reports }] = await Promise.all([
    sb.from("chat_history")
      .select("tenant_id, tokens_used, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    sb.from("client_reports")
      .select("id, title, status, format, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const totalTokensUsed = (chats || []).reduce((a, c) => a + (c.tokens_used || 0), 0);
  const readyReports = (reports || []).filter((r) => r.status === "ready").length;
  const last7Days = new Date(Date.now() - 7 * 86400000).toISOString();
  const chatsThisWeek = (chats || []).filter((c) => c.created_at > last7Days).length;

  return {
    agent: "Data Agent",
    query,
    data: {
      total_ai_interactions: (chats || []).length,
      interactions_this_week: chatsThisWeek,
      total_tokens_consumed: totalTokensUsed,
      total_reports: (reports || []).length,
      ready_reports: readyReports,
      recent_reports: (reports || []).slice(0, 5).map((r) => ({ title: r.title, status: r.status, created: r.created_at })),
    },
  };
}

async function runFinanceAgent(query) {
  const sb = getSupabase();
  const [{ data: transactions }, { data: ledger }] = await Promise.all([
    sb.from("finance_transactions")
      .select("type, amount, description, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .catch(() => ({ data: [] })),
    sb.from("token_ledger")
      .select("amount, description, created_at, tenant_id")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const revenue = (transactions || []).filter((t) => t.type === "revenue" || t.amount > 0);
  const totalRevenue = revenue.reduce((a, t) => a + (t.amount || 0), 0);
  const tokenCredits = (ledger || []).filter((l) => l.amount > 0);
  const totalGranted = tokenCredits.reduce((a, l) => a + l.amount, 0);

  return {
    agent: "Finance Agent",
    query,
    data: {
      total_revenue_logged: totalRevenue,
      revenue_transactions: revenue.length,
      tokens_granted_total: totalGranted,
      recent_transactions: (transactions || []).slice(0, 5).map((t) => ({ description: t.description, amount: t.amount, date: t.created_at })),
    },
  };
}

const TOOL_HANDLERS = {
  ask_onboarding_agent: (i) => runOnboardingAgent(i.query),
  ask_support_agent:    (i) => runSupportAgent(i.query),
  ask_ops_agent:        (i) => runOpsAgent(i.query),
  ask_sales_agent:      (i) => runSalesAgent(i.query),
  ask_data_agent:       (i) => runDataAgent(i.query),
  ask_finance_agent:    (i) => runFinanceAgent(i.query),
};

/* ── Main COO agent runner ───────────────────────────────────── */

export const runCOOAgent = async (message, history = []) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      response: "AI features are not yet active. The Anthropic API key has not been configured. Everything else is ready — once the key is added, I'll be fully live.",
      agentsConsulted: [],
    };
  }

  const claude = getClaude();

  const messages = [
    ...history.map((h) => [
      { role: "user", content: h.message },
      { role: "assistant", content: h.response },
    ]).flat(),
    { role: "user", content: message },
  ];

  const agentsConsulted = [];
  let response = "";
  let iterations = 0;
  const MAX_ITER = 5;

  let currentMessages = [...messages];

  while (iterations < MAX_ITER) {
    iterations++;
    const res = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: AGENT_TOOLS,
      messages: currentMessages,
    });

    if (res.stop_reason === "end_turn") {
      response = res.content.find((b) => b.type === "text")?.text || "";
      break;
    }

    if (res.stop_reason === "tool_use") {
      const toolUses = res.content.filter((b) => b.type === "tool_use");
      const toolResults = [];

      for (const tool of toolUses) {
        const handler = TOOL_HANDLERS[tool.name];
        let result;
        try {
          result = handler ? await handler(tool.input) : { error: "unknown tool" };
          const agentName = result.agent || tool.name.replace("ask_", "").replace("_agent", "");
          if (!agentsConsulted.includes(agentName)) agentsConsulted.push(agentName);
        } catch (e) {
          result = { error: e.message };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: res.content },
        { role: "user", content: toolResults },
      ];
    } else {
      response = res.content.find((b) => b.type === "text")?.text || "";
      break;
    }
  }

  return { response, agentsConsulted };
};
