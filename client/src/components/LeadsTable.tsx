import { Download } from "lucide-react";
import { intentLabel, statusLabel, type Lead, type Salesperson } from "../types";

export function LeadsTable({
  leads,
  salespeople,
  filters,
  onFilters,
  onExport,
  onFollowUp,
  onPatch,
  onDelete
}: {
  leads: Lead[];
  salespeople: Salesperson[];
  filters: { salespersonId: string; purchaseIntent: string; status: string; suspicious: string };
  onFilters: (filters: { salespersonId: string; purchaseIntent: string; status: string; suspicious: string }) => void;
  onExport: () => Promise<void>;
  onFollowUp: (leadId: string, form: HTMLFormElement) => Promise<void>;
  onPatch: (leadId: string, data: Partial<Lead>) => Promise<void>;
  onDelete: (leadId: string) => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>线索列表</h2>
        <button onClick={onExport}><Download size={16} />导出 Excel</button>
      </div>
      <div className="filters">
        <select value={filters.salespersonId} onChange={(e) => onFilters({ ...filters, salespersonId: e.target.value })}>
          <option value="">全部业务员</option>
          {salespeople.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
        </select>
        <select value={filters.purchaseIntent} onChange={(e) => onFilters({ ...filters, purchaseIntent: e.target.value })}>
          <option value="">全部意向</option>
          {Object.entries(intentLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => onFilters({ ...filters, status: e.target.value })}>
          <option value="">全部状态</option>
          {Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={filters.suspicious} onChange={(e) => onFilters({ ...filters, suspicious: e.target.value })}>
          <option value="">全部线索</option>
          <option value="false">正常线索</option>
          <option value="true">垃圾/可疑</option>
        </select>
      </div>
      <div className="table">
        <div className="table-row table-head">
          <span>客户</span><span>公司/职位</span><span>意向</span><span>业务员</span><span>状态</span><span>操作/跟进</span>
        </div>
        {leads.map((lead) => (
          <div className={`table-row ${lead.suspicious ? "muted-row" : ""}`} key={lead.id}>
            <span><b>{lead.name}</b><small>{lead.phone} · {lead.wechat || "无微信"}</small></span>
            <span>{lead.company || "-"}<small>{lead.title || ""}</small></span>
            <span>{intentLabel[lead.purchaseIntent]}<small>{lead.interestedProduct || ""}</small></span>
            <span>{lead.salesperson.name}</span>
            <span>{statusLabel[lead.status]}<small>{lead.suspicious ? "垃圾/可疑" : ""}</small></span>
            <span>
              <div className="inline-actions">
                <button type="button" onClick={() => onPatch(lead.id, { status: "INVALID" })}>标无效</button>
                <button type="button" onClick={() => onPatch(lead.id, { suspicious: !lead.suspicious })}>
                  {lead.suspicious ? "取消垃圾" : "标垃圾"}
                </button>
                <button type="button" onClick={() => onDelete(lead.id)}>删除</button>
              </div>
              <form className="follow-form" onSubmit={(e) => { e.preventDefault(); onFollowUp(lead.id, e.currentTarget); }}>
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
  );
}
