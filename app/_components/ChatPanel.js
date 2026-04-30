"use client";

import { useEffect, useRef, useState } from "react";

function renderContent(content) {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (!Array.isArray(content)) return [];
  return content;
}

function MessageBubble({ message }) {
  const blocks = renderContent(message.content);
  const visible = blocks.filter(
    (b) => b.type === "text" || b.type === "tool_use"
  );
  if (visible.length === 0) return null;

  return (
    <div className={`chat-message ${message.role}`}>
      {visible.map((block, i) => {
        if (block.type === "text") {
          return (
            <div key={i} className="chat-text">
              {block.text}
            </div>
          );
        }
        if (block.type === "tool_use") {
          let summary = "";
          if (block.name === "search_calendar_events") {
            summary = `searching calendar for "${block.input?.query || ""}"`;
          } else if (block.name === "create_calendar_event") {
            summary = `creating event "${block.input?.title || ""}"`;
          } else if (block.name === "list_athletes") {
            summary = "listing athletes";
          } else {
            summary = `${block.name}(...)`;
          }
          return (
            <div key={i} className="chat-tool-use">
              → {summary}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.messages?.length) {
        setMessages([...next, ...data.messages]);
      }
      if (data.error) {
        setMessages((curr) => [
          ...curr,
          {
            role: "assistant",
            content: [{ type: "text", text: `Error: ${data.error}` }],
          },
        ]);
      }
    } catch (err) {
      setMessages((curr) => [
        ...curr,
        {
          role: "assistant",
          content: [{ type: "text", text: `Error: ${err.message}` }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (loading) return;
    setMessages([]);
  };

  if (!open) {
    return (
      <button
        className="chat-fab"
        onClick={() => setOpen(true)}
        title="Open scheduling chat"
      >
        chat
      </button>
    );
  }

  // Hide intermediate messages whose only content is tool_results (they're not useful to display)
  const visible = messages.filter((m) => {
    const blocks = renderContent(m.content);
    if (m.role === "user" && blocks.every((b) => b.type === "tool_result")) {
      return false;
    }
    return true;
  });

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <strong>Scheduler</strong>
        <div className="chat-header-actions">
          <button className="icon-btn" onClick={reset} disabled={loading} title="Clear conversation">clear</button>
          <button className="icon-btn" onClick={() => setOpen(false)} title="Close">x</button>
        </div>
      </div>
      <div className="chat-messages" ref={scrollRef}>
        {visible.length === 0 && (
          <div className="chat-empty">
            Ask me to schedule a session.<br />
            e.g. <em>&ldquo;schedule Will and Jake tomorrow at 2pm&rdquo;</em>
          </div>
        )}
        {visible.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="chat-loading">thinking...</div>
          </div>
        )}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="schedule a session..."
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="btn primary" disabled={!input.trim() || loading}>
          send
        </button>
      </form>
    </div>
  );
}
