import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw } from "lucide-react";
import { api, downloadWithAuth } from "./api/client";
import { Login } from "./components/Login";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { RankingPanel } from "./components/RankingPanel";
import { EventManager } from "./components/EventManager";
import { SalespersonQrPanel } from "./components/SalespersonQrPanel";
import { BotSettings } from "./components/BotSettings";
import { BotLogs } from "./components/BotLogs";
import { LeadsTable } from "./components/LeadsTable";
import { RegisterPage } from "./pages/RegisterPage";
import type { BotMessageLog, Dashboard, EventItem, Lead, Salesperson, User } from "./types";
import "./styles.css";

function AdminApp() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const request = useMemo(() => api(token), [token]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventId, setEventId] = useState("");
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<BotMessageLog[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [filters, setFilters] = useState({ salespersonId: "", purchaseIntent: "", status: "", suspicious: "" });
  const [message, setMessage] = useState("");

  const currentEvent = events.find((item) => item.id === eventId);

  function storeLogin(nextToken: string, nextUser: User) {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  async function loadEvents() {
    const data = await request<EventItem[]>("/api/events");
    setEvents(data);
    if (!eventId && data[0]) setEventId(data[0].id);
  }

  async function refresh() {
    if (!eventId) return;
    const params = new URLSearchParams({ eventId });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    const [sales, leadRows, board, logRows] = await Promise.all([
      request<Salesperson[]>(`/api/events/${eventId}/salespeople`),
      request<Lead[]>(`/api/leads?${params}`),
      request<Dashboard>(`/api/dashboard?eventId=${eventId}`),
      request<BotMessageLog[]>(`/api/bot-message-logs?eventId=${eventId}`)
    ]);
    setSalespeople(sales);
    setLeads(leadRows);
    setDashboard(board);
    setLogs(logRows);
  }

  useEffect(() => {
    if (token) loadEvents().catch((error) => setMessage(error.message));
  }, [token]);

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, [eventId, filters]);

  if (!token || !user) return <Login onLogin={storeLogin} />;

  function eventPayload(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      name: data.get("name"),
      location: data.get("location"),
      targetLeads: Number(data.get("targetLeads") || 0),
      startsAt: data.get("startsAt"),
      endsAt: data.get("endsAt"),
      broadcastStartTime: data.get("broadcastStartTime") || "09:00",
      broadcastEndTime: data.get("broadcastEndTime") || "18:00",
      dailySummaryTime: data.get("dailySummaryTime") || "18:00",
      privacyText: data.get("privacyText") || undefined
    };
  }

  async function createEvent(form: HTMLFormElement) {
    await request("/api/events", { method: "POST", body: JSON.stringify(eventPayload(form)) });
    form.reset();
    await loadEvents();
  }

  async function updateEvent(form: HTMLFormElement) {
    if (!eventId) return;
    const data = new FormData(form);
    await request(`/api/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: data.get("name"),
        location: data.get("location"),
        targetLeads: Number(data.get("targetLeads") || 0),
        broadcastStartTime: data.get("broadcastStartTime"),
        broadcastEndTime: data.get("broadcastEndTime"),
        dailySummaryTime: data.get("dailySummaryTime"),
        privacyText: data.get("privacyText"),
        isActive: data.get("isActive") === "true"
      })
    });
    await loadEvents();
    await refresh();
  }

  async function createSalesperson(form: HTMLFormElement) {
    const formData = new FormData(form);
    await request(`/api/events/${eventId}/salespeople`, {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        phone: formData.get("phone"),
        team: formData.get("team"),
        targetLeads: Number(formData.get("targetLeads") || 0)
      })
    });
    form.reset();
    await refresh();
  }

  async function updateSalesperson(id: string, data: Partial<Salesperson>) {
    await request(`/api/events/${eventId}/salespeople/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    await refresh();
  }

  async function regenerateSalesperson(id: string) {
    await request(`/api/events/${eventId}/salespeople/${id}/regenerate-token`, { method: "POST" });
    await refresh();
  }

  async function addFollowUp(leadId: string, form: HTMLFormElement) {
    const formData = new FormData(form);
    await request(`/api/leads/${leadId}/followups`, {
      method: "POST",
      body: JSON.stringify({
        result: formData.get("result"),
        status: formData.get("status"),
        nextFollowUpAt: formData.get("nextFollowUpAt") || undefined
      })
    });
    form.reset();
    await refresh();
  }

  async function patchLead(leadId: string, data: Partial<Lead>) {
    await request(`/api/leads/${leadId}`, { method: "PATCH", body: JSON.stringify(data) });
    await refresh();
  }

  async function deleteLead(leadId: string) {
    if (!confirm("确定删除这条线索吗？")) return;
    await request(`/api/leads/${leadId}`, { method: "DELETE" });
    await refresh();
  }

  async function exportExcel() {
    const params = new URLSearchParams({ eventId });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    await downloadWithAuth(`/api/leads/export?${params}`, token, "expo-leads.xlsx");
  }

  async function sendBroadcast(type: "ranking" | "summary") {
    const result = await request<{ sent: boolean; reason?: string }>(`/api/events/${eventId}/broadcast/${type}`, { method: "POST" });
    setMessage(result.sent ? "已发送到企业微信群" : result.reason || "未发送");
    await refresh();
  }

  async function createReminder(form: HTMLFormElement) {
    const formData = new FormData(form);
    await request(`/api/events/${eventId}/reminders`, {
      method: "POST",
      body: JSON.stringify({ content: formData.get("content"), sendAt: formData.get("sendAt") })
    });
    form.reset();
    setMessage("提醒已保存，到点会自动发送");
  }

  async function saveWebhook(form: HTMLFormElement) {
    const formData = new FormData(form);
    await request("/api/settings/wework", {
      method: "POST",
      body: JSON.stringify({ webhookUrl: formData.get("webhookUrl") })
    });
    form.reset();
    setMessage("企业微信 Webhook 已加密保存");
  }

  async function downloadQr(person: Salesperson) {
    await downloadWithAuth(`/api/events/${eventId}/salespeople/${person.id}/qr.png`, token, `${person.name}.png`);
  }

  async function downloadAllQr() {
    for (const person of salespeople) {
      await downloadQr(person);
    }
  }

  return (
    <main className="app-shell">
      <aside>
        <h1>展会战报</h1>
        <p>{user.name} · {user.role}</p>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="ghost" onClick={() => refresh()}><RefreshCw size={16} />刷新</button>
        <button className="ghost" onClick={() => { localStorage.clear(); location.reload(); }}>退出</button>
      </aside>
      <section className="content">
        {message && <p className="notice">{message}</p>}
        <DashboardMetrics dashboard={dashboard} />
        <RankingPanel dashboard={dashboard} onBroadcast={() => sendBroadcast("ranking")} />
        {user.role === "ADMIN" && <EventManager event={currentEvent} onCreate={createEvent} onUpdate={updateEvent} />}
        <SalespersonQrPanel
          salespeople={salespeople}
          onCreate={createSalesperson}
          onUpdate={updateSalesperson}
          onRegenerate={regenerateSalesperson}
          onDownload={downloadQr}
          onDownloadAll={downloadAllQr}
        />
        {user.role === "ADMIN" && (
          <BotSettings
            onSaveWebhook={saveWebhook}
            onCreateReminder={createReminder}
            onSummary={() => sendBroadcast("summary")}
          />
        )}
        <LeadsTable
          leads={leads}
          salespeople={salespeople}
          filters={filters}
          onFilters={setFilters}
          onExport={exportExcel}
          onFollowUp={addFollowUp}
          onPatch={patchLead}
          onDelete={deleteLead}
        />
        <BotLogs logs={logs} />
      </section>
    </main>
  );
}

function Router() {
  const match = location.pathname.match(/^\/register\/([^/]+)/);
  if (match) return <RegisterPage token={match[1]} />;
  return <AdminApp />;
}

createRoot(document.getElementById("root")!).render(<Router />);
