import { prisma } from "../db.js";
import { isTodayRange } from "../utils/dates.js";

export async function getDashboard(eventId: string, salespersonId?: string | null) {
  const leadScope: any = { eventId };
  const salesScope: any = { eventId };
  if (salespersonId) {
    leadScope.salespersonId = salespersonId;
    salesScope.id = salespersonId;
  }

  const todayRange = isTodayRange();
  const [event, todayTotal, cumulativeTotal, todayHighIntent, cumulativeHighIntent, salespeople] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.lead.count({ where: { ...leadScope, suspicious: false, submittedAt: todayRange } }),
    prisma.lead.count({ where: { ...leadScope, suspicious: false } }),
    prisma.lead.count({ where: { ...leadScope, suspicious: false, purchaseIntent: "HIGH", submittedAt: todayRange } }),
    prisma.lead.count({ where: { ...leadScope, suspicious: false, purchaseIntent: "HIGH" } }),
    prisma.salesperson.findMany({ where: salesScope })
  ]);

  const ranking = await Promise.all(salespeople.map(async (salesperson) => {
    const [todayCount, totalCount] = await Promise.all([
      prisma.lead.count({ where: { eventId, salespersonId: salesperson.id, suspicious: false, submittedAt: todayRange } }),
      prisma.lead.count({ where: { eventId, salespersonId: salesperson.id, suspicious: false } })
    ]);
    return {
      id: salesperson.id,
      name: salesperson.name,
      todayCount,
      totalCount,
      count: totalCount,
      targetLeads: salesperson.targetLeads,
      completionRate: salesperson.targetLeads ? Math.round((totalCount / salesperson.targetLeads) * 100) : 0
    };
  }));

  ranking.sort((a, b) => b.todayCount - a.todayCount || b.totalCount - a.totalCount);

  return {
    todayTotal,
    cumulativeTotal,
    total: cumulativeTotal,
    todayHighIntent,
    cumulativeHighIntent,
    highIntent: cumulativeHighIntent,
    targetLeads: event?.targetLeads ?? 0,
    completionRate: event?.targetLeads ? Math.round((cumulativeTotal / event.targetLeads) * 100) : 0,
    bySales: ranking,
    ranking
  };
}
