import { Plus, QrCode } from "lucide-react";
import type { Salesperson } from "../types";

export function SalespersonQrPanel({
  salespeople,
  onCreate,
  onUpdate,
  onRegenerate,
  onDownload,
  onDownloadAll
}: {
  salespeople: Salesperson[];
  onCreate: (form: HTMLFormElement) => Promise<void>;
  onUpdate: (id: string, data: Partial<Salesperson>) => Promise<void>;
  onRegenerate: (id: string) => Promise<void>;
  onDownload: (person: Salesperson) => Promise<void>;
  onDownloadAll: () => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2><QrCode size={18} />业务员二维码</h2>
        <button onClick={onDownloadAll}>批量下载二维码</button>
      </div>
      <form className="compact-form" onSubmit={(e) => { e.preventDefault(); onCreate(e.currentTarget); }}>
        <input name="name" placeholder="业务员姓名" required />
        <input name="phone" placeholder="手机号" />
        <input name="team" placeholder="团队" />
        <input name="targetLeads" type="number" placeholder="目标线索数" />
        <button><Plus size={16} />添加并生成二维码</button>
      </form>
      <div className="qr-grid">
        {salespeople.map((person) => (
          <article className="qr-item" key={person.id}>
            <img src={person.qrCodeDataUrl} alt={`${person.name}二维码`} />
            <b>{person.name}</b>
            <small>{person.team || "未分组"} · 目标 {person.targetLeads} · {person.isActive ? "启用" : "停用"}</small>
            <input readOnly value={person.registerUrl} onFocus={(e) => e.currentTarget.select()} />
            <div className="inline-actions">
              <button onClick={() => onDownload(person)} type="button">下载 PNG</button>
              <button onClick={() => onRegenerate(person.id)} type="button">重生成</button>
              <button onClick={() => onUpdate(person.id, { isActive: !person.isActive })} type="button">
                {person.isActive ? "停用" : "启用"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
