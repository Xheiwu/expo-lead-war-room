export type Role = "ADMIN" | "SALES" | "FOLLOWER";
export type PurchaseIntent = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type LeadStatus = "UNFOLLOWED" | "CALLED" | "INTERESTED" | "INVALID" | "QUOTED" | "WON";

export type User = { id: string; name: string; email: string; role: Role; salespersonId?: string | null };
export type EventItem = {
  id: string;
  name: string;
  location?: string;
  targetLeads: number;
  startsAt: string;
  endsAt: string;
  broadcastStartTime: string;
  broadcastEndTime: string;
  dailySummaryTime: string;
  privacyText: string;
  isActive: boolean;
};
export type Salesperson = {
  id: string;
  name: string;
  phone?: string;
  team?: string;
  targetLeads: number;
  isActive: boolean;
  registerUrl: string;
  qrCodeDataUrl: string;
};
export type Lead = {
  id: string;
  name: string;
  phone: string;
  company?: string;
  title?: string;
  wechat?: string;
  interestedProduct?: string;
  purchaseIntent: PurchaseIntent;
  status: LeadStatus;
  suspicious: boolean;
  note?: string;
  submittedAt: string;
  nextFollowUpAt?: string;
  salesperson: { id: string; name: string };
  followUps: Array<{ id: string; result: string; createdAt: string }>;
};
export type Dashboard = {
  todayTotal: number;
  cumulativeTotal: number;
  todayHighIntent: number;
  cumulativeHighIntent: number;
  completionRate: number;
  ranking: Array<{ id: string; name: string; todayCount: number; totalCount: number; completionRate: number }>;
};
export type BotMessageLog = {
  id: string;
  eventId?: string;
  type: string;
  content: string;
  status: string;
  failureReason?: string;
  retryCount: number;
  sentAt?: string;
  createdAt: string;
};

export const intentLabel: Record<PurchaseIntent, string> = { HIGH: "高", MEDIUM: "中", LOW: "低", UNKNOWN: "未知" };
export const statusLabel: Record<LeadStatus, string> = {
  UNFOLLOWED: "未跟进",
  CALLED: "已电话",
  INTERESTED: "有意向",
  INVALID: "无效",
  QUOTED: "已报价",
  WON: "已成交"
};
