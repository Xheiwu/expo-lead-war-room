import cron from "node-cron";
import { prisma } from "./db.js";
import { buildDailySummaryMarkdown, buildRankingMarkdown, retryFailedBotMessages, sendWeworkMarkdown } from "./services/weworkService.js";
import { isTimeInRange } from "./utils/dates.js";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  cron.schedule("0 */2 * * *", async () => {
    try {
      const now = new Date();
      const events = await prisma.event.findMany({
        where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } }
      });
      for (const event of events) {
        try {
          if (!isTimeInRange(now, event.broadcastStartTime, event.broadcastEndTime)) continue;
          const markdown = await buildRankingMarkdown(event.id, "today");
          if (markdown) await sendWeworkMarkdown(markdown, "RANKING_TODAY", event.id);
        } catch (error) {
          console.error("Ranking broadcast failed", event.id, error);
        }
      }
    } catch (error) {
      console.error("Ranking schedule failed", error);
    }
  });

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const dueReminders = await prisma.reminder.findMany({
        where: { sentAt: null, sendAt: { lte: now } },
        include: { event: true },
        take: 10
      });

      for (const reminder of dueReminders) {
        try {
          await sendWeworkMarkdown(`## ${reminder.event.name} 明日提醒\n${reminder.content}`, "REMINDER", reminder.eventId);
          await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } });
        } catch (error) {
          console.error("Reminder failed", reminder.id, error);
        }
      }

      const hhmm = now.toTimeString().slice(0, 5);
      const events = await prisma.event.findMany({
        where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now }, dailySummaryTime: hhmm }
      });
      for (const event of events) {
        try {
          const key = `daily_summary_${event.id}_${now.toISOString().slice(0, 10)}`;
          const alreadySent = await prisma.secureSetting.findUnique({ where: { key } });
          if (alreadySent) continue;

          const markdown = await buildDailySummaryMarkdown(event.id);
          if (markdown) await sendWeworkMarkdown(markdown, "DAILY_SUMMARY", event.id);
          await prisma.secureSetting.create({ data: { key, value: "sent" } });
        } catch (error) {
          console.error("Daily summary failed", event.id, error);
        }
      }

      await retryFailedBotMessages();
    } catch (error) {
      console.error("Minute schedule failed", error);
    }
  });
}
