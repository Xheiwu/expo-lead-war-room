import { Router } from "express";
import { prisma } from "../db.js";
import { authRequired, requireRole } from "../auth.js";
import { asyncHandler } from "../utils/errors.js";
import { webhookSchema } from "../schemas.js";
import {
  buildDailySummaryMarkdown,
  buildRankingMarkdown,
  hasWebhook,
  sendWeworkMarkdown,
  setEncryptedWebhook
} from "../services/weworkService.js";

export const botRoutes = Router();
botRoutes.use(authRequired);

botRoutes.get("/settings/wework", requireRole("ADMIN"), asyncHandler(async (_req, res) => {
  res.json({ configured: await hasWebhook(), source: process.env.WEWORK_WEBHOOK_URL ? "env" : "database" });
}));

botRoutes.post("/settings/wework", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const input = webhookSchema.parse(req.body);
  if (process.env.WEWORK_WEBHOOK_URL) {
    return res.status(400).json({ success: false, code: "WEBHOOK_FROM_ENV", message: "当前使用环境变量配置 Webhook，请在服务器环境变量中修改" });
  }
  await setEncryptedWebhook(input.webhookUrl);
  res.json({ configured: true });
}));

botRoutes.get("/bot-message-logs", requireRole("ADMIN", "FOLLOWER"), asyncHandler(async (req, res) => {
  const where: any = {};
  if (req.query.eventId) where.eventId = String(req.query.eventId);
  if (req.query.status) where.status = String(req.query.status);
  const logs = await prisma.botMessageLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(logs);
}));

botRoutes.post("/events/:eventId/broadcast/ranking", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const markdown = await buildRankingMarkdown(req.params.eventId, "today");
  if (!markdown) return res.status(404).json({ success: false, code: "EVENT_NOT_FOUND", message: "活动不存在" });
  res.json(await sendWeworkMarkdown(markdown, "RANKING_TODAY", req.params.eventId));
}));

botRoutes.post("/events/:eventId/broadcast/summary", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const markdown = await buildDailySummaryMarkdown(req.params.eventId);
  if (!markdown) return res.status(404).json({ success: false, code: "EVENT_NOT_FOUND", message: "活动不存在" });
  res.json(await sendWeworkMarkdown(markdown, "DAILY_SUMMARY", req.params.eventId));
}));
