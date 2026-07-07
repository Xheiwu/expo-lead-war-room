import bcrypt from "bcryptjs";
import { Router } from "express";
import QRCode from "qrcode";
import { prisma } from "../db.js";
import { randomToken } from "../crypto.js";
import { authRequired, requireRole } from "../auth.js";
import { asyncHandler } from "../utils/errors.js";
import { eventSchema, eventUpdateSchema, reminderSchema, salespersonSchema, salespersonUpdateSchema } from "../schemas.js";

export function createEventRoutes(publicClientUrl: string) {
  const router = Router();
  router.use(authRequired);

  router.get("/", asyncHandler(async (_req, res) => {
    const events = await prisma.event.findMany({ orderBy: { startsAt: "desc" } });
    res.json(events);
  }));

  router.post("/", requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const input = eventSchema.parse(req.body);
    const event = await prisma.event.create({
      data: {
        ...input,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt)
      }
    });
    res.json(event);
  }));

  router.patch("/:eventId", requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const input = eventUpdateSchema.parse(req.body);
    const data: any = { ...input };
    if (input.startsAt) data.startsAt = new Date(input.startsAt);
    if (input.endsAt) data.endsAt = new Date(input.endsAt);
    const event = await prisma.event.update({ where: { id: req.params.eventId }, data });
    res.json(event);
  }));

  router.get("/:eventId/salespeople", asyncHandler(async (req, res) => {
    const where: any = { eventId: req.params.eventId };
    if (req.user?.role === "SALES") where.id = req.user.salespersonId || "__none__";
    const salespeople = await prisma.salesperson.findMany({ where, orderBy: { createdAt: "desc" } });
    const withQr = await Promise.all(salespeople.map(async (item) => ({
      ...item,
      registerUrl: `${publicClientUrl}/register/${item.publicToken}`,
      qrCodeDataUrl: await QRCode.toDataURL(`${publicClientUrl}/register/${item.publicToken}`)
    })));
    res.json(withQr);
  }));

  router.post("/:eventId/salespeople", requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const input = salespersonSchema.parse(req.body);
    let userId: string | undefined;
    if (input.email && input.password) {
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, 10),
          role: "SALES"
        }
      });
      userId = user.id;
    }
    const salesperson = await prisma.salesperson.create({
      data: {
        eventId: req.params.eventId,
        userId,
        name: input.name,
        phone: input.phone,
        team: input.team,
        targetLeads: input.targetLeads,
        publicToken: randomToken()
      }
    });
    res.json(salesperson);
  }));

  router.patch("/:eventId/salespeople/:salespersonId", requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const input = salespersonUpdateSchema.parse(req.body);
    const salesperson = await prisma.salesperson.update({
      where: { id: req.params.salespersonId },
      data: {
        name: input.name,
        phone: input.phone,
        team: input.team,
        targetLeads: input.targetLeads,
        isActive: input.isActive
      }
    });
    res.json(salesperson);
  }));

  router.post("/:eventId/salespeople/:salespersonId/regenerate-token", requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const salesperson = await prisma.salesperson.update({
      where: { id: req.params.salespersonId },
      data: { publicToken: randomToken() }
    });
    res.json(salesperson);
  }));

  router.get("/:eventId/salespeople/:salespersonId/qr.png", requireRole("ADMIN", "FOLLOWER", "SALES"), asyncHandler(async (req, res) => {
    const salesperson = await prisma.salesperson.findUniqueOrThrow({ where: { id: req.params.salespersonId } });
    const url = `${publicClientUrl}/register/${salesperson.publicToken}`;
    const png = await QRCode.toBuffer(url, { type: "png", width: 512 });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(salesperson.name)}.png`);
    res.send(png);
  }));

  router.post("/:eventId/reminders", requireRole("ADMIN"), asyncHandler(async (req, res) => {
    const input = reminderSchema.parse(req.body);
    const reminder = await prisma.reminder.create({
      data: { eventId: req.params.eventId, content: input.content, sendAt: new Date(input.sendAt) }
    });
    res.json(reminder);
  }));

  return router;
}
