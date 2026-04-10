import { FormEvent, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

export function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Ready");

  async function handleGreet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (window.__TAURI__) {
      const result = await invoke<string>("greet", { name });
      setMessage(result);
      return;
    }

    const response = await fetch(`/api/greet?name=${encodeURIComponent(name)}`);
    const data = (await response.json()) as { message: string };
    setMessage(data.message);
  }

  return (
    <main className="app">
      <h1>ApplyManager</h1>
      <p>Starter app (Tauri desktop + Docker web mode)</p>
      <form onSubmit={handleGreet} className="row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
        />
        <button type="submit">Test command</button>
      </form>
      <p>{message}</p>
    </main>
  );
}
