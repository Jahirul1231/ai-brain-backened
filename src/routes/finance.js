import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getSupabase } from "../lib/supabase.js";

export const financeRouter = Router();
financeRouter.use(authenticate, requireAdmin);

financeRouter.get("/finance/summary", async (req, res, next) => {
  try {
    const { month } = req.query; // YYYY-MM
    const start = month ? `${month}-01` : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const end   = month ? `${month}-31` : new Date().toISOString().slice(0, 10);

    const { data, error } = await getSupabase().from("transactions")
      .select("type, amount").gte("date", start).lte("date", end);
    if (error) throw error;

    const revenue  = data.filter((t) => t.type === "revenue").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = data.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const refunds  = data.filter((t) => t.type === "refund").reduce((s, t) => s + Number(t.amount), 0);
    const grossProfit = revenue - refunds;
    const ebitda = grossProfit - expenses;

    res.json({ revenue, expenses, refunds, grossProfit, ebitda, period: { start, end } });
  } catch (err) { next(err); }
});

financeRouter.get("/finance/transactions", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("transactions")
      .select("*").order("date", { ascending: false }).limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

financeRouter.post("/finance/transactions", async (req, res, next) => {
  try {
    const { type, category, amount, description, date, currency } = req.body;
    if (!type || !category || !amount || !description) return res.status(400).json({ error: "type, category, amount, description required" });
    const { data, error } = await getSupabase().from("transactions")
      .insert({ type, category, amount, description, date: date || undefined, currency: currency || "USD" }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});
