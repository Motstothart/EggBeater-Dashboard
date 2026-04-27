"use client";

import { useState, useTransition } from "react";
import { addPunchListItem, completePunchListItem } from "@/lib/actions";

export default function PunchList({ items }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const value = text;
    setText("");
    startTransition(async () => {
      try {
        await addPunchListItem(value);
      } catch (err) {
        alert(`Failed: ${err.message}`);
      }
    });
  };

  return (
    <section className="punch-list">
      <h2>Today's Punch List</h2>
      <form onSubmit={submit} className="punch-form">
        <input
          type="text"
          placeholder="Add a quick task (Enter to save)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
        />
      </form>
      {items.length === 0 ? (
        <div className="punch-list-empty">Nothing here yet. Add an item above or wait for the scheduled task.</div>
      ) : (
        <ul>
          {items.map((item) => (
            <PunchItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PunchItem({ item }) {
  const [pending, startTransition] = useTransition();
  const onComplete = () => {
    startTransition(async () => {
      try {
        await completePunchListItem(item.id);
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };
  return (
    <li className={pending ? "pending" : ""}>
      <label>
        <input type="checkbox" checked={false} onChange={onComplete} disabled={pending} />
        <span>{item.text}</span>
      </label>
    </li>
  );
}
