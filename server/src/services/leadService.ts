import { prisma } from "../db.js";
import { AppError } from "../utils/errors.js";
import { isValidChinaMobile, normalizePhone } from "../utils/phone.js";
import type { z } from "zod";
import type { leadPublicSchema, leadUpdateSchema } from "../schemas.js";

export const leadInclude = {
  salesperson: { select: { id: true, name: true } },
  followUps: { orderBy: { createdAt: "desc" as const } }
};

export async function createPublicLead(token: string, input: z.infer<typeof leadPublicSchema>) {
  if (input.website) throw new AppError(400, "提交失败", "BOT_REJECTED");
  if (!input.consentToContact) throw new AppError(400, "请先同意后续联系", "CONSENT_REQUIRED");

  const salesperson = await prisma.salesperson.findUnique({
    where: { publicToken: token },
    include: { event: true }
  });
  if (!salesperson || !salesperson.isActive || !salesperson.event.isActive) {
    throw new AppError(404, "登记入口不存在或已停用", "REGISTER_NOT_FOUND");
  }

  const phone = normalizePhone(input.phone);
  if (!isValidChinaMobile(phone)) throw new AppError(400, "请输入有效的中国大陆手机号", "INVALID_PHONE");

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
    return { leadId: updated.id, duplicated: true, message: "已更新登记信息，请勿重复提交" };
  }

  const lead = await prisma.lead.create({
    data: {
      eventId: salesperson.eventId,
      salespersonId: salesperson.id,
      name: input.name,
      phone,
      company: input.company,
      title: input.title,
      wechat: input.wechat,
      interestedProduct: input.interestedProduct,
      purchaseIntent: input.purchaseIntent,
      note: input.note,
      consentToContact: input.consentToContact
    }
  });
  return { leadId: lead.id, duplicated: false, message: "提交成功" };
}

export async function updateLead(leadId: string, input: z.infer<typeof leadUpdateSchema>) {
  const data: any = { ...input };
  if (input.phone) {
    const phone = normalizePhone(input.phone);
    if (!isValidChinaMobile(phone)) throw new AppError(400, "请输入有效的中国大陆手机号", "INVALID_PHONE");
    data.phone = phone;
  }
  return prisma.lead.update({ where: { id: leadId }, data, include: leadInclude });
}
