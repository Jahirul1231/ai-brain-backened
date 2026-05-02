import { getSupabase } from "../lib/supabase.js";

export const requireTokens = (minRequired = 1) => async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("token_balances")
      .select("balance")
      .eq("tenant_id", req.tenant.id)
      .single();

    if (error || !data) {
      return res.status(402).json({ error: "no_token_balance", message: "Token balance not found" });
    }
    if (data.balance < minRequired) {
      return res.status(402).json({
        error: "insufficient_tokens",
        message: `Requires ${minRequired} token(s), balance is ${data.balance}`,
        balance: data.balance,
      });
    }

    req.tokenBalance = data.balance;
    next();
  } catch (err) {
    next(err);
  }
};
