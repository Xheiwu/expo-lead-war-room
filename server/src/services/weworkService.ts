import axios from "axios";
import { prisma } from "../db.js";
import { decryptText, encryptText } from "../crypto.js";
import { endOfToday, formatDateTime, isTodayRange, startOfToday } from "../utils/dates.js";

const WEBHOOK_SETTING_KEY = "wework_webhook_url";
const MAX_RETRY = 3;

async function getWebhookUrl() {
  if (process.env.WEWORK_WEBHOOK_URL) return process.env.WEWORK_WEBHOOK_URL;
  const setting = await prisma.secureSetting.findUnique({ where: { key: WEBHOOK_SETTING_KEY } });
  if (!setting?.value) return null;
  return decryptText(setting.value);
}

export async function setEncryptedWebhook(url: string) {
  await prisma.secureSetting.upsert({
    where: { key: WEBHOOK_SETTING_KEY },
    update: { value: encryptText(url) },
    create: { key: WEBHOOK_SETTING_KEY, value: encryptText(url) }
  });
}

export async function hasWebhook() {
  if (process.env.WEWORK_WEBHOOK_URL) return true;
  return Boolean(await prisma.secureSetting.findUnique({ where: { key: WEBHOOK_SETTING_KEY } }));
}

export async function sendWeworkMarkdown(content: string, type = "MANUAL", eventId?: string | null) {
  const log = await prisma.botMessageLog.create({
    data: { eventId: eventId || undefined, type, content, status: "PENDING" }
  });
  return sendLogWithRetry(log.id);
}

export async function sendLogWithRetry(logId: string) {
  const webhook = await getWebhookUrl();
  if (!webhook) {
    await prisma.botMessageLog.update({
      where: { id: logId },
      data: { status: "FAILED", failureReason: "未配置企业微信 Webhook" }
    });
    return { sent: false, reason: "未配置企业微信 Webhook" };
  }

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRY; attempt += 1) {
    try {
      const log = await prisma.botMessageLog.findUniqueOrThrow({ where: { id: logId } });
      await axios.post(webhook, {
        msgtype: "markdown",
        markdown: { content: log.content }
      });
      await prisma.botMessageLog.update({
        where: { id: logId },
        data: { status: "SENT", sentAt: new Date(), retryCount: attempt - 1, failureReason: null }
      });
      return { sent: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await prisma.botMessageLog.update({
        where: { id: logId },
        data: { status: attempt >= MAX_RETRY ? "FAILED" : "RETRYING", retryCount: attempt, failureReason: lastError }
      });
    }
  }

  return { sent: false, reason: lastError };
}

export async function retryFailedBotMessages() {
  const logs = await prisma.botMessageLog.findMany({
    where: { status: { in: ["FAILED", "RETRYING"] }, retryCount: { lt: MAX_RETRY } },
    orderBy: { createdAt: "asc" },
    take: 10
  });
  for (const log of logs) {
    try {
      await sendLogWithRetry(log.id);
    } catch (error) {
      console.error("Retry bot message failed", error);
    }
  }
}

export async function buildRankingMarkdown(eventId: string, mode: "today" | "total" = "today") {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;
  const todayRange = isTodayRange();
  const salespeople = await prisma.salesperson.findMany({ where: { eventId, isActive: true } });
  const rows = await Promise.all(salespeople.map(async (item) => {
    const [todayCount, totalCount] = await Promise.all([
      prisma.lead.count({ where: { eventId, salespersonId: item.id, suspicious: false, submittedAt: todayRange } }),
      prisma.lead.count({ where: { eventId, salespersonId: item.id, suspicious: false } })
    ]);
    return { name: item.name, todayCount, totalCount };
  }));

  rows.sort((a, b) => b.todayCount - a.todayCount || b.totalCount - a.totalCount);
  const ranking = rows
    .map((item, index) => `${index + 1}. ${item.name}：今日 ${item.todayCount} 条 / 累计 ${item.totalCount} 条`)
    .join("\n");

  return [
    `## ${event.name} ${mode === "today" ? "今日线索排行榜" : "累计线索排行榜"}`,
    ranking || "暂无线索",
    "",
    `更新时间：${formatDateTime(new Date())}`
  ].join("\n");
}

export async function buildDailySummaryMarkdown(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const todayRange = { gte: startOfToday(), lte: endOfToday() };
  const [total, high, won, salespeople] = await Promise.all([
    prisma.lead.count({ where: { eventId, suspicious: false, submittedAt: todayRange } }),
    prisma.lead.count({ where: { eventId, suspicious: false, purchaseIntent: "HIGH", submittedAt: todayRange } }),
    prisma.lead.count({ where: { eventId, suspicious: false, status: "WON", submittedAt: todayRange } }),
    prisma.salesperson.findMany({ where: { eventId, isActive: true } })
  ]);

  const ranking = await Promise.all(salespeople.map(async (item) => ({
    name: item.name,
    count: await prisma.lead.count({ where: { eventId, salespersonId: item.id, suspicious: false, submittedAt: todayRange } })
  })));

  const rankingText = ranking
    .sort((a, b) => b.count - a.count)
    .map((item, index) => `${index + 1}. ${item.name}：${item.count} 条`)
    .join("\n");

  return [
    `## ${event.name} 今日战报`,
    `今日总线索：${total}`,
    `今日高意向：${high}`,
    `今日已成交：${won}`,
    "",
    rankingText || "暂无线索",
    "",
    `目标完成率：${event.targetLeads ? Math.round((total / event.targetLeads) * 100) : 0}%`
  ].join("\n");
}
