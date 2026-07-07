import { Megaphone } from "lucide-react";

export function BotSettings({
  onSaveWebhook,
  onCreateReminder,
  onSummary
}: {
  onSaveWebhook: (form: HTMLFormElement) => Promise<void>;
  onCreateReminder: (form: HTMLFormElement) => Promise<void>;
  onSummary: () => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>企业微信播报</h2>
        <button onClick={onSummary}><Megaphone size={16} />发送当天总结</button>
      </div>
      <form className="compact-form" onSubmit={(e) => { e.preventDefault(); onSaveWebhook(e.currentTarget); }}>
        <input name="webhookUrl" type="url" placeholder="企业微信群机器人 Webhook，只会加密保存到后端" required />
        <button>保存 Webhook</button>
      </form>
      <hr />
      <form className="compact-form" onSubmit={(e) => { e.preventDefault(); onCreateReminder(e.currentTarget); }}>
        <textarea name="content" placeholder="第二天早上的提醒内容，如礼仪礼节、穿衣要求、班车信息" required />
        <input name="sendAt" type="datetime-local" required />
        <button>保存定时提醒</button>
      </form>
    </section>
  );
}
