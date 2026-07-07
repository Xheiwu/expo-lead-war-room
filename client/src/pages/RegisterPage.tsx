import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { EventItem } from "../types";

export function RegisterPage({ token }: { token: string }) {
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
    consentToContact: false,
    website: ""
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
      setForm((prev) => ({ ...prev, name: "", phone: "", company: "", title: "", wechat: "", note: "", website: "" }));
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
          <input className="honeypot" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <select value={form.purchaseIntent} onChange={(e) => setForm({ ...form, purchaseIntent: e.target.value })}>
            <option value="UNKNOWN">采购意向未知</option>
            <option value="HIGH">高意向</option>
            <option value="MEDIUM">中意向</option>
            <option value="LOW">低意向</option>
          </select>
          <textarea placeholder="备注" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <label className="check-line">
            <input type="checkbox" checked={form.consentToContact} onChange={(e) => setForm({ ...form, consentToContact: e.target.checked })} />
            {meta?.event.privacyText || "同意后续电话、微信或短信联系"}
          </label>
          <button disabled={loading || !meta}>{loading ? "提交中..." : "提交登记"}</button>
        </form>
        {message && <p className="notice">{message}</p>}
      </section>
    </main>
  );
}
