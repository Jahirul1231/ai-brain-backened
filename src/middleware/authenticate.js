import { getSupabase } from "../lib/supabase.js";

export const authenticate = async (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized", message: "Missing Bearer token" });
  }

  const token = header.slice(7);
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    }

    // Fetch tenant profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("tenant_id, role, tenants(id, name, slug, plan)")
      .eq("id", data.user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(401).json({ error: "unauthorized", message: "User profile not found" });
    }

    req.user = { id: data.user.id, email: data.user.email, role: profile.role, tenantId: profile.tenant_id };
    req.tenant = profile.tenants;
    next();
  } catch (err) {
    next(err);
  }
};
