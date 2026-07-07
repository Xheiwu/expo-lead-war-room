import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { getRequestIp, rateLimit } from "../utils/rateLimit.js";
import { leadPublicSchema } from "../schemas.js";
import { createPublicLead } from "../services/leadService.js";

export const publicRoutes = Router();

publicRoutes.get("/register/:token", asyncHandler(async (req, res) => {
  const salesperson = await prisma.salesperson.findUnique({
    where: { publicToken: req.params.token },
    include: { event: true }
  });
  if (!salesperson || !salesperson.isActive || !salesperson.event.isActive) {
    throw new AppError(404, "登记入口不存在或已停用", "REGISTER_NOT_FOUND");
  }
  res.json({
    event: {
      id: salesperson.event.id,
      name: salesperson.event.name,
      location: salesperson.event.location,
      privacyText: salesperson.event.privacyText
    },
    salesperson: { name: salesperson.name }
  });
}));

publicRoutes.post(
  "/register/:token/leads",
  rateLimit({ key: (req) => `ip:${getRequestIp(req)}`, windowMs: 60_000, max: 20 }),
  rateLimit({ key: (req) => `token:${req.params.token}`, windowMs: 60_000, max: 60 }),
  asyncHandler(async (req, res) => {
    const input = leadPublicSchema.parse(req.body);
    res.json(await createPublicLead(req.params.token, input));
  })
);
