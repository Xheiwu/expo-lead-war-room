import ExcelJS from "exceljs";
import { Router } from "express";
import { prisma } from "../db.js";
import { authRequired, requireRole } from "../auth.js";
import { asyncHandler, AppError } from "../utils/errors.js";
import { followUpSchema, leadUpdateSchema } from "../schemas.js";
import { leadInclude, updateLead } from "../services/leadService.js";
import { formatDateTime } from "../utils/dates.js";

export const leadRoutes = Router();
leadRoutes.use(authRequired);

leadRoutes.get("/", asyncHandler(async (req, res) => {
  const { eventId, salespersonId, purchaseIntent, status, suspicious } = req.query;
  const where: any = {};
  if (eventId) where.eventId = String(eventId);
  if (salespersonId) where.salespersonId = String(salespersonId);
  if (purchaseIntent) where.purchaseIntent = String(purchaseIntent);
  if (status) where.status = String(status);
  if (suspicious !== undefined && suspicious !== "") where.suspicious = String(suspicious) === "true";
  if (req.user?.role === "SALES") where.salespersonId = req.user.salespersonId || "__none__";
  const leads = await prisma.lead.findMany({ where, include: leadInclude, orderBy: { submittedAt: "desc" } });
  res.json(leads);
}));

leadRoutes.patch("/:leadId", requireRole("ADMIN", "FOLLOWER", "SALES"), asyncHandler(async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
  if (!lead) throw new AppError(404, "线索不存在", "LEAD_NOT_FOUND");
  if (req.user?.role === "SALES" && lead.salespersonId !== req.user.salespersonId) {
    throw new AppError(403, "只能编辑自己的线索", "FORBIDDEN");
  }
  const input = leadUpdateSchema.parse(req.body);
  res.json(await updateLead(lead.id, input));
}));

leadRoutes.delete("/:leadId", requireRole("ADMIN"), asyncHandler(async (req, res) => {
  await prisma.lead.delete({ where: { id: req.params.leadId } });
  res.json({ ok: true });
}));

leadRoutes.post("/:leadId/followups", requireRole("ADMIN", "FOLLOWER", "SALES"), asyncHandler(async (req, res) => {
  const input = followUpSchema.parse(req.body);
  const lead = await prisma.lead.findUnique({ where: { id: req.params.leadId } });
  if (!lead) throw new AppError(404, "线索不存在", "LEAD_NOT_FOUND");
  if (req.user?.role === "SALES" && lead.salespersonId !== req.user.salespersonId) {
    throw new AppError(403, "只能跟进自己的线索", "FORBIDDEN");
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
  res.json(await prisma.lead.findUniqueOrThrow({ where: { id: lead.id }, include: leadInclude }));
}));

leadRoutes.get("/export", requireRole("ADMIN", "FOLLOWER"), asyncHandler(async (req, res) => {
  const { eventId, salespersonId, purchaseIntent, status, suspicious } = req.query;
  const where: any = {};
  if (eventId) where.eventId = String(eventId);
  if (salespersonId) where.salespersonId = String(salespersonId);
  if (purchaseIntent) where.purchaseIntent = String(purchaseIntent);
  if (status) where.status = String(status);
  if (suspicious !== undefined && suspicious !== "") where.suspicious = String(suspicious) === "true";

  const leads = await prisma.lead.findMany({
    where,
    include: { salesperson: true, followUps: { orderBy: { createdAt: "desc" } } },
    orderBy: { submittedAt: "desc" }
  });
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
    { header: "跟进状态", key: "status", width: 14 },
    { header: "是否垃圾", key: "suspicious", width: 12 },
    { header: "业务员", key: "salesperson", width: 16 },
    { header: "最近跟进内容", key: "lastFollowUp", width: 30 },
    { header: "下次跟进时间", key: "nextFollowUpAt", width: 22 },
    { header: "备注", key: "note", width: 30 },
    { header: "提交时间", key: "submittedAt", width: 22 }
  ];
  leads.forEach((lead) => sheet.addRow({
    ...lead,
    salesperson: lead.salesperson.name,
    suspicious: lead.suspicious ? "是" : "否",
    lastFollowUp: lead.followUps[0]?.result || "",
    nextFollowUpAt: formatDateTime(lead.nextFollowUpAt),
    submittedAt: formatDateTime(lead.submittedAt)
  }));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=expo-leads.xlsx");
  await workbook.xlsx.write(res);
  res.end();
}));
