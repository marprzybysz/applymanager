import { FormEvent, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Ready");

  async function handleGreet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await invoke<string>("greet", { name });
    setMessage(result);
  }

  return (
    <main className="app">
      <h1>ApplyManager</h1>
      <p>Starter desktop app (Tauri + React + TypeScript)</p>
      <form onSubmit={handleGreet} className="row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
        />
        <button type="submit">Test Rust command</button>
      </form>
      <p>{message}</p>
    </main>
  );
}
