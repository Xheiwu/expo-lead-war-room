import cron from "node-cron";
import { prisma } from "./db.js";
import { buildDailySummaryMarkdown, buildRankingMarkdown, sendWeworkMarkdown } from "./wework.js";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  cron.schedule("0 */2 * * *", async () => {
    const events = await prisma.event.findMany({ where: { isActive: true } });
    for (const event of events) {
      const markdown = await buildRankingMarkdown(event.id);
      if (markdown) await sendWeworkMarkdown(markdown);
    }
  });

  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const dueReminders = await prisma.reminder.findMany({
      where: { sentAt: null, sendAt: { lte: now } },
      include: { event: true },
      take: 10
    });

    for (const reminder of dueReminders) {
      await sendWeworkMarkdown(`## ${reminder.event.name} 明日提醒\n${reminder.content}`);
      await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } });
    }

    const hhmm = now.toTimeString().slice(0, 5);
    const events = await prisma.event.findMany({
      where: { isActive: true, dailySummaryTime: hhmm }
    });
    for (const event of events) {
      const key = `daily_summary_${event.id}_${now.toISOString().slice(0, 10)}`;
      const alreadySent = await prisma.secureSetting.findUnique({ where: { key } });
      if (alreadySent) continue;

      const markdown = await buildDailySummaryMarkdown(event.id);
      if (markdown) await sendWeworkMarkdown(markdown);
      await prisma.secureSetting.create({ data: { key, value: "sent" } });
    }
  });
}
