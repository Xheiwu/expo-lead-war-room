import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { randomToken } from "../src/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "管理员",
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("Admin123!", 10),
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { email: "follow@example.com" },
    update: {},
    create: {
      name: "电话跟进",
      email: "follow@example.com",
      passwordHash: await bcrypt.hash("Follow123!", 10),
      role: "FOLLOWER"
    }
  });

  const event = await prisma.event.upsert({
    where: { id: "demo-event" },
    update: {},
    create: {
      id: "demo-event",
      name: "2026 上海行业展",
      location: "上海国家会展中心",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      targetLeads: 300,
      dailySummaryTime: "18:00"
    }
  });

  const salesUser = await prisma.user.upsert({
    where: { email: "sales@example.com" },
    update: {},
    create: {
      name: "王销售",
      email: "sales@example.com",
      passwordHash: await bcrypt.hash("Sales123!", 10),
      role: "SALES"
    }
  });

  await prisma.salesperson.upsert({
    where: { userId: salesUser.id },
    update: {},
    create: {
      userId: salesUser.id,
      eventId: event.id,
      name: "王销售",
      phone: "13800000000",
      team: "华东队",
      targetLeads: 80,
      publicToken: randomToken()
    }
  });

  console.log(`Seeded demo data. Admin: ${admin.email}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
