CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Event" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "targetLeads" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "broadcastStartTime" TEXT NOT NULL DEFAULT '09:00',
  "broadcastEndTime" TEXT NOT NULL DEFAULT '18:00',
  "dailySummaryTime" TEXT NOT NULL DEFAULT '18:00',
  "privacyText" TEXT NOT NULL DEFAULT '我同意主办方及参展企业基于本次展会沟通目的，通过电话、微信或短信与我联系。',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Salesperson" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT UNIQUE,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "team" TEXT,
  "publicToken" TEXT NOT NULL UNIQUE,
  "targetLeads" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Salesperson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Salesperson_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "salespersonId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "company" TEXT,
  "title" TEXT,
  "wechat" TEXT,
  "interestedProduct" TEXT,
  "purchaseIntent" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "note" TEXT,
  "consentToContact" BOOLEAN NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNFOLLOWED',
  "suspicious" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastFollowedAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Lead_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FollowUpRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT NOT NULL,
  "operatorUserId" TEXT,
  "result" TEXT NOT NULL,
  "status" TEXT,
  "nextFollowUpAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FollowUpRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Reminder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sendAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SecureSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "BotMessageLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BotMessageLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Lead_eventId_phone_key" ON "Lead"("eventId", "phone");
CREATE INDEX "Salesperson_eventId_idx" ON "Salesperson"("eventId");
CREATE INDEX "Lead_salespersonId_idx" ON "Lead"("salespersonId");
CREATE INDEX "Lead_purchaseIntent_idx" ON "Lead"("purchaseIntent");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_suspicious_idx" ON "Lead"("suspicious");
CREATE INDEX "Reminder_sendAt_sentAt_idx" ON "Reminder"("sendAt", "sentAt");
CREATE INDEX "BotMessageLog_eventId_idx" ON "BotMessageLog"("eventId");
CREATE INDEX "BotMessageLog_status_idx" ON "BotMessageLog"("status");
CREATE INDEX "BotMessageLog_type_idx" ON "BotMessageLog"("type");
CREATE INDEX "BotMessageLog_createdAt_idx" ON "BotMessageLog"("createdAt");
