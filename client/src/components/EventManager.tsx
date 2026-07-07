import { Plus } from "lucide-react";
import type { EventItem } from "../types";

export function EventManager({
  event,
  onCreate,
  onUpdate
}: {
  event?: EventItem;
  onCreate: (form: HTMLFormElement) => Promise<void>;
  onUpdate: (form: HTMLFormElement) => Promise<void>;
}) {
  return (
    <section className="panel">
      <h2>活动配置</h2>
      <form className="compact-form" onSubmit={(e) => { e.preventDefault(); onCreate(e.currentTarget); }}>
        <input name="name" placeholder="活动名称" required />
        <input name="location" placeholder="地点" />
        <input name="targetLeads" type="number" placeholder="目标线索数" />
        <input name="startsAt" type="datetime-local" required />
        <input name="endsAt" type="datetime-local" required />
        <input name="broadcastStartTime" type="time" defaultValue="09:00" />
        <input name="broadcastEndTime" type="time" defaultValue="18:00" />
        <input name="dailySummaryTime" type="time" defaultValue="18:00" />
        <textarea name="privacyText" placeholder="登记页隐私说明" />
        <button><Plus size={16} />创建活动</button>
      </form>
      {event && (
        <>
          <hr />
          <form className="compact-form" onSubmit={(e) => { e.preventDefault(); onUpdate(e.currentTarget); }}>
            <input name="name" defaultValue={event.name} placeholder="活动名称" />
            <input name="location" defaultValue={event.location || ""} placeholder="地点" />
            <input name="targetLeads" type="number" defaultValue={event.targetLeads} />
            <input name="broadcastStartTime" type="time" defaultValue={event.broadcastStartTime || "09:00"} />
            <input name="broadcastEndTime" type="time" defaultValue={event.broadcastEndTime || "18:00"} />
            <input name="dailySummaryTime" type="time" defaultValue={event.dailySummaryTime || "18:00"} />
            <select name="isActive" defaultValue={String(event.isActive)}>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
            <textarea name="privacyText" defaultValue={event.privacyText || ""} placeholder="登记页隐私说明" />
            <button>保存当前活动</button>
          </form>
        </>
      )}
    </section>
  );
}
