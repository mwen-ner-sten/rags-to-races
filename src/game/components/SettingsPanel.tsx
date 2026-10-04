"use client";

import { useState } from "react";
import { useGame } from "../store";

export function SettingsPanel() {
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const reset = useGame((s) => s.reset);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const copy = async () => {
    const data = exportSave();
    setText(data);
    try {
      await navigator.clipboard.writeText(data);
      setMessage("Save copied to the clipboard.");
    } catch {
      setMessage("Copy the text below to keep your save.");
    }
  };

  return (
    <section className="section" aria-labelledby="settings-h">
      <h2 id="settings-h">Settings</h2>
      <p className="sub">Your game saves to this browser every few seconds. Export it to move it somewhere else.</p>
      <div className="actions">
        <button className="btn" onClick={copy}>
          Export save
        </button>
        <button
          className="btn"
          onClick={() => {
            const error = importSave(text);
            setMessage(error ?? "Save loaded. Your previous game is kept as a backup in this browser.");
          }}
          disabled={!text.trim()}
        >
          Import save
        </button>
      </div>
      <label className="block">
        <span className="label">Save text</span>
        <textarea id="save-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a save here to import it" />
      </label>
      {message && <p className="notice">{message}</p>}
      <h3 className="label">Start over</h3>
      <p className="sub">Wipes this browser’s save, including your Notebook. This can’t be undone.</p>
      {confirmWipe ? (
        <div className="actions">
          <button
            className="btn danger"
            onClick={() => {
              reset();
              setConfirmWipe(false);
              setMessage("New game started.");
            }}
          >
            Yes, wipe everything
          </button>
          <button className="btn" onClick={() => setConfirmWipe(false)}>
            Keep my game
          </button>
        </div>
      ) : (
        <button className="btn danger" onClick={() => setConfirmWipe(true)}>
          Start a new game
        </button>
      )}
      <p className="muted small">Rags to Races is free and open source. No ads, no purchases.</p>
      <p className="muted small num" data-testid="build-version">
        Build {process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev"} · {process.env.NEXT_PUBLIC_RELEASE_CHANNEL ?? "dev"}
      </p>
    </section>
  );
}
