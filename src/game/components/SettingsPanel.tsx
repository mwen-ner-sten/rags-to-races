"use client";

import { useState } from "react";
import { CheckpointShelf } from "./CheckpointShelf";
import { useGame } from "../store";
import { useExperimentalCareers } from "../useExperimental";

export function SettingsPanel() {
  const exportSave = useGame((s) => s.exportSave);
  const exportBackup = useGame((s) => s.exportBackup);
  const saveBlocked = useGame((s) => s.saveBlocked);
  const importSave = useGame((s) => s.importSave);
  const reset = useGame((s) => s.reset);
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const setExperimental = useGame((s) => s.setExperimental);
  const experimental = useExperimentalCareers();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const copy = async (backup = false) => {
    const data = backup ? exportBackup() : exportSave();
    if (!data) {
      setMessage("No browser backup is available.");
      return;
    }
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
      {saveBlocked && <p className="notice" role="alert">Automatic saving is paused to protect the original save. Export browser backup to keep a copy. A successful import or new game will turn saving back on.</p>}
      <div className="actions">
        <button className="btn" onClick={() => copy()}>
          Export save
        </button>
        <button className="btn" onClick={() => copy(true)}>Export browser backup</button>
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
      <h3 className="label">Help</h3>
      <div className="actions">
        {game && game.meta.seasonsPlayed === 0 && !game.era && (
          <label className="check">
            <input type="checkbox" checked={!game.meta.guideOff} onChange={(e) => dispatch({ type: "setGuide", on: e.target.checked })} />
            Show the first-Season guide
          </label>
        )}
        <button
          className="btn"
          onClick={() => {
            dispatch({ type: "showTipsAgain" });
            setMessage("Tips will show again as you visit each part of the game.");
          }}
        >
          Show tips again
        </button>
      </div>
      <h3 className="label">Experimental</h3>
      <label className="check">
        <input type="checkbox" checked={experimental} onChange={(e) => setExperimental(e.target.checked)} />
        Experimental careers — unbalanced, may change
      </label>
      <p className="sub">Shows the Manufacturer works deals, the Service counter and Shop Move, the County Motor Pool, Heritage and the County Baton. They are unfinished side careers that have not been playtested. This is a setting for this browser, not part of your save, so turning it off only hides them.</p>
      <CheckpointShelf />
      <h3 className="label">Start over</h3>
      <p className="sub">Starts a fresh game and Notebook. Your garage checkpoints stay saved. Export browser backup keeps your previous browser save until another backup replaces it.</p>
      {confirmWipe ? (
        <div className="actions">
          <button
            className="btn danger"
            onClick={() => {
              if (reset()) {
                setConfirmWipe(false);
                setMessage("New game started. Your previous save is available through Export browser backup.");
              }
            }}
          >
            Yes, start a new game
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
