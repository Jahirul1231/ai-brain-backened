import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getStats, getTenants, getTenantDetail, grantTokens } from "../services/adminService.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/admin/stats", async (_req, res, next) => {
  try {
    res.json(await getStats());
  } catch (err) { next(err); }
});

adminRouter.get("/admin/tenants", async (_req, res, next) => {
  try {
    res.json(await getTenants());
  } catch (err) { next(err); }
});

adminRouter.get("/admin/tenants/:id", async (req, res, next) => {
  try {
    res.json(await getTenantDetail(req.params.id));
  } catch (err) { next(err); }
});

adminRouter.post("/admin/tenants/:id/grant", async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: "amount must be >= 1" });
    const result = await grantTokens({
      tenantId: req.params.id,
      amount: parseInt(amount, 10),
      adminEmail: req.user.email,
    });
    res.json(result);
  } catch (err) { next(err); }
});
