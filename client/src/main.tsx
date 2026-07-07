import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, Megaphone, Plus, QrCode, RefreshCw } from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

type Role = "ADMIN" | "SALES" | "FOLLOWER";
type User = { id: string; name: string; email: string; role: Role; salespersonId?: string | null };
type EventItem = { id: string; name: string; location?: string; targetLeads: number; startsAt: string; endsAt: string; dailySummaryTime: string };
type Salesperson = { id: string; name: string; phone?: string; team?: string; targetLeads: number; registerUrl: string; qrCodeDataUrl: string };
type Lead = {
  id: string;
  name: string;
  phone: string;
  company?: string;
  title?: string;
  wechat?: string;
  interestedProduct?: string;
  purchaseIntent: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  status: "UNFOLLOWED" | "CALLED" | "INTERESTED" | "INVALID" | "QUOTED" | "WON";
  note?: string;
  submittedAt: string;
  nextFollowUpAt?: string;
  salesperson: { id: string; name: string };
  followUps: Array<{ id: string; result: string; createdAt: string }>;
};

const intentLabel = { HIGH: "高", MEDIUM: "中", LOW: "低", UNKNOWN: "未知" };
const statusLabel = { UNFOLLOWED: "未跟进", CALLED: "已电话", INTERESTED: "有意向", INVALID: "无效", QUOTED: "已报价", WON: "已成交" };

function api(token?: string | null) {
  return async <T,>(path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "请求失败" }));
      throw new Error(error.message || "请求失败");
    }
    return response.json() as Promise<T>;
  };
}

function RegisterPage({ token }: { token: string }) {
  const request = useMemo(() => api(), []);
  const [meta, setMeta] = useState<{ event: EventItem; salesperson: { name: string } } | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    company: "",
    title: "",
    wechat: "",
    interestedProduct: "",
    purchaseIntent: "UNKNOWN",
    note: "",
    consentToContact: false
  });

  useEffect(() => {
    request<{ event: EventItem; salesperson: { name: string } }>(`/api/public/register/${token}`)
      .then(setMeta)
      .catch((error) => setMessage(error.message));
  }, [request, token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const result = await request<{ message: string }>(`/api/public/register/${token}/leads`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(result.message);
      setForm((prev) => ({ ...prev, name: "", phone: "", company: "", title: "", wechat: "", note: "" }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-shell">
      <section className="register-panel">
        <p className="eyebrow">{meta?.event.name || "展会登记"}</p>
        <h1>客户线索登记</h1>
        <p className="muted">接待业务员：{meta?.salesperson.name || "读取中"}</p>
        <form onSubmit={submit} className="form-grid">
          <input required placeholder="姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required placeholder="手机号" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="公司" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input placeholder="职位" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="微信号" value={form.wechat} onChange={(e) => setForm({ ...form, wechat: e.target.value })} />
          <input placeholder="感兴趣产品" value={form.interestedProduct} onChange={(e) => setForm({ ...form, interestedProduct: e.target.value })} />
          <select value={form.purchaseIntent} onChange={(e) => setForm({ ...form, purchaseIntent: e.target.value })}>
            <option value="UNKNOWN">采购意向未知</option>
            <option value="HIGH">高意向</option>
            <option value="MEDIUM">中意向</option>
            <option value="LOW">低意向</option>
          </select>
          <textarea placeholder="备注" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <label className="check-line">
            <input type="checkbox" checked={form.consentToContact} onChange={(e) => setForm({ ...form, consentToContact: e.target.checked })} />
            同意后续电话、微信或短信联系
          </label>
          <button disabled={loading || !meta}>{loading ? "提交中..." : "提交登记"}</button>
        </form>
        {message && <p className="notice">{message}</p>}
      </section>
    </main>
  );
}

function Login({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api()<{
        token: string;
        user: User;
      }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      onLogin(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submit}>
        <h1>展会战报后台</h1>
        <input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button>登录</button>
        {error && <p className="notice danger">{error}</p>}
      </form>
    </main>
  );
}

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
  const [dashboard, setDashboard] = useState<any>(null);
  const [filters, setFilters] = useState({ salespersonId: "", purchaseIntent: "", status: "" });
  const [message, setMessage] = useState("");

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
    if (filters.salespersonId) params.set("salespersonId", filters.salespersonId);
    if (filters.purchaseIntent) params.set("purchaseIntent", filters.purchaseIntent);
    if (filters.status) params.set("status", filters.status);
    const [sales, leadRows, board] = await Promise.all([
      request<Salesperson[]>(`/api/events/${eventId}/salespeople`),
      request<Lead[]>(`/api/leads?${params}`),
      request<any>(`/api/dashboard?eventId=${eventId}`)
    ]);
    setSalespeople(sales);
    setLeads(leadRows);
    setDashboard(board);
  }

  useEffect(() => {
    if (token) loadEvents().catch((error) => setMessage(error.message));
  }, [token]);

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
  }, [eventId, filters]);

  if (!token || !user) return <Login onLogin={storeLogin} />;

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request("/api/events", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        location: formData.get("location"),
        targetLeads: Number(formData.get("targetLeads") || 0),
        startsAt: formData.get("startsAt"),
        endsAt: formData.get("endsAt"),
        dailySummaryTime: formData.get("dailySummaryTime")
      })
    });
    event.currentTarget.reset();
    await loadEvents();
  }

  async function createSalesperson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request(`/api/events/${eventId}/salespeople`, {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        phone: formData.get("phone"),
        team: formData.get("team"),
        targetLeads: Number(formData.get("targetLeads") || 0)
      })
    });
    event.currentTarget.reset();
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

  async function exportExcel() {
    const params = new URLSearchParams({ eventId });
    if (filters.salespersonId) params.set("salespersonId", filters.salespersonId);
    if (filters.purchaseIntent) params.set("purchaseIntent", filters.purchaseIntent);
    if (filters.status) params.set("status", filters.status);
    const response = await fetch(`${API_BASE}/api/leads/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      setMessage("导出失败，请确认账号权限");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expo-leads.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function sendBroadcast(type: "ranking" | "summary") {
    const result = await request<{ sent: boolean; reason?: string }>(`/api/events/${eventId}/broadcast/${type}`, { method: "POST" });
    setMessage(result.sent ? "已发送到企业微信群" : result.reason || "未发送");
  }

  async function createReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request(`/api/events/${eventId}/reminders`, {
      method: "POST",
      body: JSON.stringify({ content: formData.get("content"), sendAt: formData.get("sendAt") })
    });
    event.currentTarget.reset();
    setMessage("提醒已保存，到点会自动发送");
  }

  async function saveWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await request("/api/settings/wework", {
      method: "POST",
      body: JSON.stringify({ webhookUrl: formData.get("webhookUrl") })
    });
    event.currentTarget.reset();
    setMessage("企业微信 Webhook 已加密保存");
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
        <div className="metrics">
          <Metric label="今日总线索" value={dashboard?.todayTotal ?? 0} />
          <Metric label="高意向客户" value={dashboard?.highIntent ?? 0} />
          <Metric label="总线索" value={dashboard?.total ?? 0} />
          <Metric label="目标完成率" value={`${dashboard?.completionRate ?? 0}%`} />
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>业务员排行榜</h2>
            <button onClick={() => sendBroadcast("ranking")}><Megaphone size={16} />立即播报</button>
          </div>
          <div className="rank-list">
            {(dashboard?.ranking || []).map((row: any, index: number) => (
              <div key={row.id}><b>{index + 1}. {row.name}</b><span>{row.count} 条 · {row.completionRate}%</span></div>
            ))}
          </div>
        </section>

        {user.role === "ADMIN" && (
          <div className="two-col">
            <section className="panel">
              <h2>创建活动</h2>
              <form className="compact-form" onSubmit={createEvent}>
                <input name="name" placeholder="活动名称" required />
                <input name="location" placeholder="地点" />
                <input name="targetLeads" type="number" placeholder="目标线索数" />
                <input name="startsAt" type="datetime-local" required />
                <input name="endsAt" type="datetime-local" required />
                <input name="dailySummaryTime" type="time" defaultValue="18:00" />
                <button><Plus size={16} />创建</button>
              </form>
            </section>
            <section className="panel">
              <h2>添加业务员</h2>
              <form className="compact-form" onSubmit={createSalesperson}>
                <input name="name" placeholder="业务员姓名" required />
                <input name="phone" placeholder="手机号" />
                <input name="team" placeholder="团队" />
                <input name="targetLeads" type="number" placeholder="目标线索数" />
                <button><Plus size={16} />添加并生成二维码</button>
              </form>
            </section>
          </div>
        )}

        <section className="panel">
          <div className="panel-head">
            <h2><QrCode size={18} />业务员二维码</h2>
          </div>
          <div className="qr-grid">
            {salespeople.map((person) => (
              <article className="qr-item" key={person.id}>
                <img src={person.qrCodeDataUrl} alt={`${person.name}二维码`} />
                <b>{person.name}</b>
                <small>{person.team || "未分组"} · 目标 {person.targetLeads}</small>
                <input readOnly value={person.registerUrl} onFocus={(e) => e.currentTarget.select()} />
              </article>
            ))}
          </div>
        </section>

        {user.role === "ADMIN" && (
          <section className="panel">
            <div className="panel-head">
              <h2>企业微信播报</h2>
              <button onClick={() => sendBroadcast("summary")}><Megaphone size={16} />发送当天总结</button>
            </div>
            <form className="compact-form" onSubmit={saveWebhook}>
              <input name="webhookUrl" type="url" placeholder="企业微信群机器人 Webhook，只会加密保存到后端" required />
              <button>保存 Webhook</button>
            </form>
            <hr />
            <form className="compact-form" onSubmit={createReminder}>
              <textarea name="content" placeholder="第二天早上的提醒内容，如礼仪礼节、穿衣要求、班车信息" required />
              <input name="sendAt" type="datetime-local" required />
              <button>保存定时提醒</button>
            </form>
          </section>
        )}

        <section className="panel">
          <div className="panel-head">
            <h2>线索列表</h2>
            <button onClick={exportExcel}><Download size={16} />导出 Excel</button>
          </div>
          <div className="filters">
            <select value={filters.salespersonId} onChange={(e) => setFilters({ ...filters, salespersonId: e.target.value })}>
              <option value="">全部业务员</option>
              {salespeople.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
            </select>
            <select value={filters.purchaseIntent} onChange={(e) => setFilters({ ...filters, purchaseIntent: e.target.value })}>
              <option value="">全部意向</option>
              {Object.entries(intentLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">全部状态</option>
              {Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div className="table">
            <div className="table-row table-head">
              <span>客户</span><span>公司/职位</span><span>意向</span><span>业务员</span><span>状态</span><span>跟进</span>
            </div>
            {leads.map((lead) => (
              <div className="table-row" key={lead.id}>
                <span><b>{lead.name}</b><small>{lead.phone} · {lead.wechat || "无微信"}</small></span>
                <span>{lead.company || "-"}<small>{lead.title || ""}</small></span>
                <span>{intentLabel[lead.purchaseIntent]}<small>{lead.interestedProduct || ""}</small></span>
                <span>{lead.salesperson.name}</span>
                <span>{statusLabel[lead.status]}</span>
                <span>
                  <form className="follow-form" onSubmit={(e) => { e.preventDefault(); addFollowUp(lead.id, e.currentTarget); }}>
                    <input name="result" placeholder="电话结果" />
                    <select name="status" defaultValue={lead.status}>
                      {Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <input name="nextFollowUpAt" type="datetime-local" />
                    <button>保存</button>
                  </form>
                  {lead.followUps[0] && <small>最近：{lead.followUps[0].result}</small>}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="metric"><span>{label}</span><b>{value}</b></article>;
}

function Router() {
  const match = location.pathname.match(/^\/register\/([^/]+)/);
  if (match) return <RegisterPage token={match[1]} />;
  return <AdminApp />;
}

createRoot(document.getElementById("root")!).render(<Router />);
