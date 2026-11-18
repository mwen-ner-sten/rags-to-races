"use client";
import { useEffect, useState } from "react";
import {
  CHECKPOINT_PREFIX,
  CHECKPOINT_SLOTS,
  createCheckpoint,
  readCheckpoint,
  writeCheckpoint,
  type CheckpointEntry,
  type CheckpointSlot,
} from "../checkpoints";
import { useGame } from "../store";

type Operation = "restore" | "replace" | "remove";
export function CheckpointShelf() {
  const [slots, setSlots] = useState<CheckpointEntry[]>([]);
  const [slot, setSlot] = useState<CheckpointSlot>(1);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<{ operation: Operation; entry: CheckpointEntry } | null>(null);
  const refresh = () => {
    try {
      setSlots(CHECKPOINT_SLOTS.map((n) => readCheckpoint(window.localStorage, n)));
    } catch {
      setMessage("This browser’s storage is unavailable.");
    }
  };
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(CHECKPOINT_PREFIX)) refresh();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  const entry = slots.find((e) => e.slot === slot);
  const run = (operation: Operation, reviewed: CheckpointEntry) => {
    const store = useGame.getState();
    if (!store.game) return;
    try {
      const storage = window.localStorage;
      if (operation === "restore") {
        const current = readCheckpoint(storage, reviewed.slot);
        if (current.raw !== reviewed.raw || !current.checkpoint)
          setMessage("The saved garage changed. Review it again.");
        else {
          const error = store.importSave(current.checkpoint.text, { backupLive: true });
          setMessage(error ?? "Opened " + current.checkpoint.label + ". The checkpoint is still saved.");
        }
      } else {
        const next = operation === "replace" ? createCheckpoint(label, store.game, store.exportSave()) : null;
        const error = writeCheckpoint(storage, reviewed, next);
        setMessage(
          error ??
            (next ? "Saved " + next.label + " in slot " + reviewed.slot + "." : "Cleared slot " + reviewed.slot + "."),
        );
      }
    } catch {
      setMessage("This browser could not access the checkpoint.");
    }
    setPending(null);
    refresh();
  };
  return (
    <details
      className="section"
      onToggle={(e) => {
        if (e.target === e.currentTarget && e.currentTarget.open) refresh();
      }}
    >
      <summary>Garage checkpoints</summary>
      <p>Save one of three checkpoints before a reset. Opening it restores your garage and clock to that moment, so you can try another opening from the same parts and money.</p>
      <label>
        Checkpoint slot{" "}
        <select
          value={slot}
          onChange={(e) => {
            setSlot(Number(e.target.value) as CheckpointSlot);
            setPending(null);
            setLabel("");
            setMessage("");
          }}
        >
          {slots.map((e) => (
            <option value={e.slot} key={e.slot}>
              {e.slot} · {e.checkpoint?.label ?? (e.raw ? "Unreadable garage" : "Empty")}
            </option>
          ))}
        </select>
      </label>
      {entry?.checkpoint && <p>{entry.checkpoint.note}</p>}
      <label>
        Checkpoint name{" "}
        <input
          maxLength={48}
          placeholder="Before moving the shop"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      {entry && !pending && (
        <div className="actions">
          <button
            className="btn small"
            onClick={() => (entry.raw ? setPending({ operation: "replace", entry }) : run("replace", entry))}
          >
            {entry.raw ? "Replace checkpoint" : "Save checkpoint"}
          </button>
          {entry.checkpoint && (
            <button className="btn small" onClick={() => setPending({ operation: "restore", entry })}>
              Open checkpoint
            </button>
          )}
          {entry.raw && (
            <button className="link-btn" onClick={() => setPending({ operation: "remove", entry })}>
              Clear slot
            </button>
          )}
        </div>
      )}
      {pending && (
        <div>
          <p>
            {pending.operation === "restore"
              ? `Open ${pending.entry.checkpoint?.label} as your active game? Settings keeps your current garage in Export browser backup.`
              : pending.operation === "replace"
                ? `Replace ${pending.entry.checkpoint?.label ?? "the unreadable garage"} in slot ${pending.entry.slot} with your current game?`
                : `Clear ${pending.entry.checkpoint?.label ?? "the unreadable garage"} from slot ${pending.entry.slot}?`}
          </p>
          <button className="btn small" onClick={() => run(pending.operation, pending.entry)}>
            Confirm{" "}
            {pending.operation === "restore" ? "opening" : pending.operation === "replace" ? "replacement" : "removal"}
          </button>
          <button className="link-btn" onClick={() => setPending(null)}>
            Cancel
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
