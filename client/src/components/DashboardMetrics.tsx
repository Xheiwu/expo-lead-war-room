import type { Dashboard } from "../types";
import { Metric } from "./Metric";

export function DashboardMetrics({ dashboard }: { dashboard: Dashboard | null }) {
  return (
    <div className="metrics">
      <Metric label="今日线索" value={dashboard?.todayTotal ?? 0} />
      <Metric label="累计线索" value={dashboard?.cumulativeTotal ?? 0} />
      <Metric label="今日高意向" value={dashboard?.todayHighIntent ?? 0} />
      <Metric label="累计高意向" value={dashboard?.cumulativeHighIntent ?? 0} />
      <Metric label="目标完成率" value={`${dashboard?.completionRate ?? 0}%`} />
    </div>
  );
}
