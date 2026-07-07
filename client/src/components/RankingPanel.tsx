import { Megaphone } from "lucide-react";
import type { Dashboard } from "../types";

export function RankingPanel({ dashboard, onBroadcast }: { dashboard: Dashboard | null; onBroadcast: () => void }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>业务员排行榜</h2>
        <button onClick={onBroadcast}><Megaphone size={16} />立即播报今日排行</button>
      </div>
      <div className="rank-list">
        {(dashboard?.ranking || []).map((row, index) => (
          <div key={row.id}>
            <b>{index + 1}. {row.name}</b>
            <span>今日 {row.todayCount} 条 / 累计 {row.totalCount} 条 · {row.completionRate}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
