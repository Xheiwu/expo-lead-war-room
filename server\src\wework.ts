import axios from "axios";
import { prisma } from "./db.js";
import { decryptText, encryptText } from "./crypto.js";

const WEBHOOK_SETTING_KEY = "wework_webhook_url";

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

export async function sendWeworkMarkdown(content: string) {
  const webhook = await getWebhookUrl();
  if (!webhook) return { sent: false, reason: "未配置企业微信 Webhook" };

  await axios.post(webhook, {
    msgtype: "markdown",
    markdown: { content }
  });
  return { sent: true };
}

export async function buildRankingMarkdown(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const rows = await prisma.salesperson.findMany({
    where: { eventId },
    include: { _count: { select: { leads: true } } },
    orderBy: { leads: { _count: "desc" } }
  });

  const ranking = rows
    .map((item, index) => `${index + 1}. ${item.name}：${item._count.leads} 条`)
    .join("\n");

  return [
    `## ${event.name} 线索排行榜`,
    ranking || "暂无线索",
    "",
    `更新时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`
  ].join("\n");
}

export async function buildDailySummaryMarkdown(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [total, high, won, ranking] = await Promise.all([
    prisma.lead.count({ where: { eventId, submittedAt: { gte: start, lte: end } } }),
    prisma.lead.count({ where: { eventId, purchaseIntent: "HIGH", submittedAt: { gte: start, lte: end } } }),
    prisma.lead.count({ where: { eventId, status: "WON", submittedAt: { gte: start, lte: end } } }),
    prisma.salesperson.findMany({
      where: { eventId },
      include: {
        leads: { where: { submittedAt: { gte: start, lte: end } }, select: { id: true } }
      }
    })
  ]);

  const rankingText = ranking
    .sort((a, b) => b.leads.length - a.leads.length)
    .map((item, index) => `${index + 1}. ${item.name}：${item.leads.length} 条`)
    .join("\n");

  return [
    `## ${event.name} 今日战报`,
    `今日总线索：${total}`,
    `高意向客户：${high}`,
    `已成交：${won}`,
    "",
    rankingText || "暂无线索",
    "",
    `目标完成率：${event.targetLeads ? Math.round((total / event.targetLeads) * 100) : 0}%`
  ].join("\n");
}
