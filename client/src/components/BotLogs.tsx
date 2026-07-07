import type { BotMessageLog } from "../types";

export function BotLogs({ logs }: { logs: BotMessageLog[] }) {
  return (
    <section className="panel">
      <h2>企业微信发送日志</h2>
      <div className="log-list">
        {logs.map((log) => (
          <article key={log.id} className="log-item">
            <b>{log.type} · {log.status}</b>
            <small>重试 {log.retryCount} 次 · {new Date(log.createdAt).toLocaleString()}</small>
            {log.failureReason && <small className="danger-text">{log.failureReason}</small>}
            <p>{log.content.slice(0, 180)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
