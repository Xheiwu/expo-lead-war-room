import { useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";

export function Login({ onLogin }: { onLogin: (token: string, user: User) => void }) {
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
