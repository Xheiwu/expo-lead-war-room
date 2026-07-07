import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import ExcelJS from "exceljs";
import express from "express";
import QRCode from "qrcode";
import { z } from "zod";
import { authRequired, requireRole, signUser, toAuthRole } from "./auth.js";
import { randomToken } from "./crypto.js";
import { prisma } from "./db.js";
import { startScheduler } from "./scheduler.js";
import { buildDailySummaryMarkdown, buildRankingMarkdown, hasWebhook, sendWeworkMarkdown, setEncryptedWebhook } from "./wework.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const publicClientUrl = process.env.PUBLIC_CLIENT_URL || clientOrigin;

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

const leadSelect = {
  include: {
    salesperson: { select: { id: true, name: true } },
    followUps: { orderBy: { createdAt: "desc" as const } }
  },
  orderBy: { submittedAt: "desc" as const }
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/login", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const input = schema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { salesperson: true }
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ message: "邮箱或密码错误" });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toAuthRole(user.role),
    salespersonId: user.salesperson?.id ?? null
  };
  res.json({ token: signUser(safeUser), user: safeUser });
});

app.get("/api/auth/me", authRequired, (req, res) => res.json({ user: req.user }));

app.get("/api/events", authRequired, async (_req, res) => {
  const events = await prisma.event.findMany({ orderBy: { startsAt: "desc" } });
  res.json(events);
});

app.post("/api/events", authRequired, requireRole("ADMIN"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    location: z.string().optional(),
    targetLeads: z.number().int().nonnegative().default(0),
    startsAt: z.string(),
    endsAt: z.string(),
    dailySummaryTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00")
  });
  const input = schema.parse(req.body);
  const event = await prisma.event.create({
    data: {
      ...input,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt)
    }
  });
  res.json(event);
});

app.get("/api/events/:eventId/salespeople", authRequired, async (req, res) => {
  const where: any = { eventId: req.params.eventId };
  if (req.user?.role === "SALES") where.id = req.user.salespersonId || "__none__";
  const salespeople = await prisma.salesperson.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
  const withQr = await Promise.all(salespeople.map(async (item) => ({
    ...item,
    registerUrl: `${publicClientUrl}/register/${item.publicToken}`,
    qrCodeDataUrl: await QRCode.toDataURL(`${publicClientUrl}/register/${item.publicToken}`)
  })));
  res.json(withQr);
});

app.post("/api/events/:eventId/salespeople", authRequired, requireRole("ADMIN"), async (req, res) => {
  const eventId = String(req.params.eventId);
  const schema = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    team: z.string().optional(),
    targetLeads: z.number().int().nonnegative().default(0),
    email: z.string().email().optional(),
    password: z.string().min(8).optional()
  });
  const input = schema.parse(req.body);
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
      eventId,
      userId,
      name: input.name,
      phone: input.phone,
      team: input.team,
      targetLeads: input.targetLeads,
      publicToken: randomToken()
    }
  });
  res.json(salesperson);
});

app.get("/api/public/register/:token", async (req, res) => {
  const salesperson = await prisma.salesperson.findUnique({
    where: { publicToken: req.params.token },
    include: { event: true }
  });
  if (!salesperson || !salesperson.event.isActive) return res.status(404).json({ message: "登记入口不存在或已停用" });
  res.json({
    event: { id: salesperson.event.id, name: salesperson.event.name, location: salesperson.event.location },
    salesperson: { name: salesperson.name }
  });
});

app.post("/api/public/register/:token/leads", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    phone: z.string().min(7),
    company: z.string().optional(),
    title: z.string().optional(),
    wechat: z.string().optional(),
    interestedProduct: z.string().optional(),
    purchaseIntent: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]).default("UNKNOWN"),
    note: z.string().optional(),
    consentToContact: z.boolean()
  });
  const input = schema.parse(req.body);
  if (!input.consentToContact) return res.status(400).json({ message: "请先同意后续联系" });

  const salesperson = await prisma.salesperson.findUnique({
    where: { publicToken: req.params.token },
    include: { event: true }
  });
  if (!salesperson || !salesperson.event.isActive) return res.status(404).json({ message: "登记入口不存在或已停用" });

  const phone = normalizePhone(input.phone);
  const existing = await prisma.lead.findUnique({
    where: { eventId_phone: { eventId: salesperson.eventId, phone } }
  });

  if (existing) {
    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        company: input.company,
        title: input.title,
        wechat: input.wechat,
        interestedProduct: input.interestedProduct,
        purchaseIntent: input.purchaseIntent,
        note: input.note,
        consentToContact: input.consentToContact,
        followUps: {
          create: { result: `客户重复扫码登记，原归属业务员保持不变。扫码业务员：${salesperson.name}` }
        }
      }
    });
    return res.json({ leadId: updated.id, duplicated: true, message: "已更新登记信息，请勿重复提交" });
  }

  const lead = await prisma.lead.create({
    data: {
      eventId: salesperson.eventId,
      salespersonId: salesperson.id,
      ...input,
      phone
    }
  });
  res.json({ leadId: lead.id, duplicated: false, message: "提交成功" });
});

app.get("/api/leads", authRequired, async (req, res) => {
  const { eventId, salespersonId, purchaseIntent, status } = req.query;
  const where: any = {};
  if (eventId) where.eventId = String(eventId);
  if (salespersonId) where.salespersonId = String(salespersonId);
  if (purchaseIntent) where.purchaseIntent = String(purchaseIntent);
  if (status) where.status = String(status);
  if (req.user?.role === "SALES") where.salespersonId = req.user.salespersonId || "__none__";

  const leads = await prisma.lead.findMany({ where, ...leadSelect });
  res.json(leads);
});

app.post("/api/leads/:leadId/followups", authRequired, requireRole("ADMIN", "FOLLOWER", "SALES"), async (req, res) => {
  const leadId = String(req.params.leadId);
  const schema = z.object({
    result: z.string().min(1),
    status: z.enum(["UNFOLLOWED", "CALLED", "INTERESTED", "INVALID", "QUOTED", "WON"]).optional(),
    nextFollowUpAt: z.string().optional()
  });
  const input = schema.parse(req.body);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return res.status(404).json({ message: "线索不存在" });
  if (req.user?.role === "SALES" && lead.salespersonId !== req.user.salespersonId) {
    return res.status(403).json({ message: "只能跟进自己的线索" });
  }

  await prisma.followUpRecord.create({
    data: {
      leadId: lead.id,
      operatorUserId: req.user?.id,
      result: input.result,
      status: input.status,
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : undefined
    }
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: input.status ?? lead.status,
      lastFollowedAt: new Date(),
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : undefined
    }
  });
  const updated = await prisma.lead.findUniqueOrThrow({
    where: { id: lead.id },
    include: leadSelect.include
  });
  res.json(updated);
});

app.get("/api/dashboard", authRequired, async (req, res) => {
  const eventId = String(req.query.eventId || "");
  if (!eventId) return res.status(400).json({ message: "请选择活动" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leadScope: any = { eventId };
  const salesScope: any = { eventId };
  if (req.user?.role === "SALES") {
    leadScope.salespersonId = req.user.salespersonId || "__none__";
    salesScope.id = req.user.salespersonId || "__none__";
  }

  const [event, todayTotal, highIntent, bySales] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.lead.count({ where: { ...leadScope, submittedAt: { gte: today } } }),
    prisma.lead.count({ where: { ...leadScope, purchaseIntent: "HIGH" } }),
    prisma.salesperson.findMany({
      where: salesScope,
      include: { _count: { select: { leads: true } } }
    })
  ]);

  const total = bySales.reduce((sum, item) => sum + item._count.leads, 0);
  const ranking = bySales
    .map((item) => ({
      id: item.id,
      name: item.name,
      count: item._count.leads,
      targetLeads: item.targetLeads,
      completionRate: item.targetLeads ? Math.round((item._count.leads / item.targetLeads) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  res.json({
    todayTotal,
    highIntent,
    total,
    targetLeads: event?.targetLeads ?? 0,
    completionRate: event?.targetLeads ? Math.round((total / event.targetLeads) * 100) : 0,
    bySales: ranking,
    ranking
  });
});

app.get("/api/leads/export", authRequired, requireRole("ADMIN", "FOLLOWER"), async (req, res) => {
  const { eventId, salespersonId, purchaseIntent, status } = req.query;
  const where: any = {};
  if (eventId) where.eventId = String(eventId);
  if (salespersonId) where.salespersonId = String(salespersonId);
  if (purchaseIntent) where.purchaseIntent = String(purchaseIntent);
  if (status) where.status = String(status);

  const leads = await prisma.lead.findMany({ where, include: { salesperson: true }, orderBy: { submittedAt: "desc" } });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("线索");
  sheet.columns = [
    { header: "姓名", key: "name", width: 16 },
    { header: "手机号", key: "phone", width: 18 },
    { header: "公司", key: "company", width: 24 },
    { header: "职位", key: "title", width: 18 },
    { header: "微信号", key: "wechat", width: 18 },
    { header: "感兴趣产品", key: "interestedProduct", width: 24 },
    { header: "采购意向", key: "purchaseIntent", width: 14 },
    { header: "线索状态", key: "status", width: 14 },
    { header: "业务员", key: "salesperson", width: 16 },
    { header: "备注", key: "note", width: 30 },
    { header: "提交时间", key: "submittedAt", width: 22 }
  ];
  leads.forEach((lead) => sheet.addRow({ ...lead, salesperson: lead.salesperson.name }));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=expo-leads.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

app.get("/api/settings/wework", authRequired, requireRole("ADMIN"), async (_req, res) => {
  res.json({ configured: await hasWebhook(), source: process.env.WEWORK_WEBHOOK_URL ? "env" : "database" });
});

app.post("/api/settings/wework", authRequired, requireRole("ADMIN"), async (req, res) => {
  const schema = z.object({ webhookUrl: z.string().url() });
  const input = schema.parse(req.body);
  if (process.env.WEWORK_WEBHOOK_URL) {
    return res.status(400).json({ message: "当前使用环境变量配置 Webhook，请在服务器环境变量中修改" });
  }
  await setEncryptedWebhook(input.webhookUrl);
  res.json({ configured: true });
});

app.post("/api/events/:eventId/reminders", authRequired, requireRole("ADMIN"), async (req, res) => {
  const eventId = String(req.params.eventId);
  const schema = z.object({ content: z.string().min(1), sendAt: z.string() });
  const input = schema.parse(req.body);
  const reminder = await prisma.reminder.create({
    data: { eventId, content: input.content, sendAt: new Date(input.sendAt) }
  });
  res.json(reminder);
});

app.post("/api/events/:eventId/broadcast/ranking", authRequired, requireRole("ADMIN"), async (req, res) => {
  const eventId = String(req.params.eventId);
  const markdown = await buildRankingMarkdown(eventId);
  if (!markdown) return res.status(404).json({ message: "活动不存在" });
  res.json(await sendWeworkMarkdown(markdown));
});

app.post("/api/events/:eventId/broadcast/summary", authRequired, requireRole("ADMIN"), async (req, res) => {
  const eventId = String(req.params.eventId);
  const markdown = await buildDailySummaryMarkdown(eventId);
  if (!markdown) return res.status(404).json({ message: "活动不存在" });
  res.json(await sendWeworkMarkdown(markdown));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ message: "参数错误", issues: err.issues });
  console.error(err);
  res.status(500).json({ message: "服务器开小差了，请稍后再试" });
});

startScheduler();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
