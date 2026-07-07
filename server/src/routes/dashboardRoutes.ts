import { Router } from "express";
import { authRequired } from "../auth.js";
import { asyncHandler } from "../utils/errors.js";
import { getDashboard } from "../services/dashboardService.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/", authRequired, asyncHandler(async (req, res) => {
  const eventId = String(req.query.eventId || "");
  if (!eventId) return res.status(400).json({ success: false, code: "EVENT_REQUIRED", message: "请选择活动" });
  const salespersonId = req.user?.role === "SALES" ? req.user.salespersonId || "__none__" : null;
  res.json(await getDashboard(eventId, salespersonId));
}));
