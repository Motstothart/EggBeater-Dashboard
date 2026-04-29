"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  addNote,
  toggleNote,
  deleteNote,
  toggleDeliverable,
  removeAthlete,
  updateAthlete,
  addDeliverable,
  removeDeliverable,
  updateDeliverable,
  recordManualMeeting,
  clearManualMeeting,
} from "@/lib/actions";
import { templates } from "@/lib/templates";

function formatDate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MeetingPill({ athlete }) {
  const suffix = athlete.lastMeetingSource === "manual" ? " (manual)" : "";
  if (athlete.meetingStatus === "no-data") return <span className="pill no-data">no meeting recorded</span>;
  if (athlete.meetingStatus === "overdue") return <span className="pill overdue">overdue: {athlete.weeksSinceLast}w since last{suffix}</span>;
  if (athlete.meetingStatus === "warn") return <span className="pill warn">{athlete.weeksSinceLast}w since last{suffix}</span>;
  return <span className="pill ok">last {athlete.weeksSinceLast}w ago{suffix}</span>;
}

function NextMeetingPill({ athlete }) {
  if (!athlete.nextMeeting) return null;
  return <span className="pill">next {formatDate(athlete.nextMeeting)}</span>;
}

function DeliverableRow({ athleteId, d }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(d.label);
  const [due, setDue] = useState(d.due);

  const cls = d.status === "done" ? "done" : d.alert;
  const dueLabel = formatDate(d.due);
  let suffix = "";
  if (d.status !== "done") {
    if (d.daysUntil < 0) suffix = `${Math.abs(d.daysUntil)}d overdue`;
    else suffix = `in ${d.daysUntil}d`;
  } else {
    suffix = "done";
  }

  const onToggle = () => {
    startTransition(async () => {
      try {
        await toggleDeliverable(athleteId, d.id);
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };
  const onDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete deliverable "${d.label}"?`)) return;
    startTransition(async () => {
      try {
        await removeDeliverable(athleteId, d.id);
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };
  const onEdit = () => {
    setLabel(d.label);
    setDue(d.due);
    setEditing(true);
  };
  const onCancel = () => {
    setEditing(false);
  };
  const onSave = (e) => {
    e.preventDefault();
    if (!label.trim() || !due) return;
    startTransition(async () => {
      try {
        const result = await updateDeliverable(athleteId, d.id, { label, due });
        if (!result.ok) {
          alert(result.error);
          return;
        }
        setEditing(false);
      } catch (err) {
        alert(`Failed: ${err.message}`);
      }
    });
  };

  if (editing) {
    return (
      <form className="deliverable-edit-form" onSubmit={onSave}>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
          required
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          required
        />
        <div className="add-deliverable-actions">
          <button type="button" className="icon-btn" onClick={onCancel} disabled={pending}>cancel</button>
          <button type="submit" className="icon-btn" disabled={pending || !label.trim() || !due}>
            {pending ? "..." : "save"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`deliverable ${cls} ${pending ? "pending" : ""}`}>
      <input
        type="checkbox"
        checked={d.status === "done"}
        onChange={onToggle}
        disabled={pending}
      />
      <span className="deliverable-label">{d.label}</span>
      <span className="deliverable-due">
        {dueLabel} - {suffix}
      </span>
      <button
        type="button"
        className="icon-btn deliverable-edit"
        onClick={onEdit}
        disabled={pending}
        title="Edit deliverable"
      >
        edit
      </button>
      <button
        type="button"
        className="icon-btn deliverable-delete"
        onClick={onDelete}
        disabled={pending}
        title="Delete deliverable"
      >
        x
      </button>
    </div>
  );
}

function AddDeliverableForm({ athleteId, onClose }) {
  const [label, setLabel] = useState("");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e) => {
    e.preventDefault();
    if (!label.trim() || !due) return;
    startTransition(async () => {
      try {
        const result = await addDeliverable(athleteId, label, due);
        if (!result.ok) {
          alert(result.error);
          return;
        }
        setLabel("");
        setDue("");
        onClose();
      } catch (err) {
        alert(`Failed: ${err.message}`);
      }
    });
  };

  return (
    <form className="add-deliverable-form" onSubmit={submit}>
      <input
        type="text"
        placeholder="Deliverable description"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
        required
      />
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        required
      />
      <div className="add-deliverable-actions">
        <button type="button" className="icon-btn" onClick={onClose} disabled={pending}>cancel</button>
        <button type="submit" className="icon-btn" disabled={pending || !label.trim() || !due}>
          {pending ? "..." : "add"}
        </button>
      </div>
    </form>
  );
}

function NotesPopover({ athlete, onClose }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const value = text;
    setText("");
    startTransition(async () => {
      try {
        await addNote(athlete.id, value);
      } catch (err) {
        alert(`Failed: ${err.message}`);
      }
    });
  };

  const open = athlete.notes.filter((n) => !n.done);
  const done = athlete.notes.filter((n) => n.done);

  return (
    <div className="popover" ref={ref} onClick={(e) => e.stopPropagation()}>
      <div className="popover-header">
        <strong>{athlete.name} - notes</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Close">x</button>
      </div>
      <form onSubmit={submit} className="note-form">
        <input
          type="text"
          placeholder="Add a note (Enter to save)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
          autoFocus
        />
      </form>
      {open.length === 0 && done.length === 0 && (
        <div className="popover-empty">No notes yet.</div>
      )}
      {open.length > 0 && (
        <ul className="note-list">
          {open.map((n) => (
            <NoteItem key={n.id} athleteId={athlete.id} note={n} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="note-done-section">
          <summary>{done.length} completed</summary>
          <ul className="note-list">
            {done.map((n) => (
              <NoteItem key={n.id} athleteId={athlete.id} note={n} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function NoteItem({ athleteId, note }) {
  const [pending, startTransition] = useTransition();
  const onToggle = () => {
    startTransition(async () => {
      try {
        await toggleNote(athleteId, note.id);
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };
  const onDelete = () => {
    if (!confirm("Delete this note?")) return;
    startTransition(async () => {
      try {
        await deleteNote(athleteId, note.id);
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };
  return (
    <li className={`note ${note.done ? "done" : ""} ${pending ? "pending" : ""}`}>
      <input type="checkbox" checked={note.done} onChange={onToggle} disabled={pending} />
      <span className="note-text">{note.text}</span>
      <button className="icon-btn note-delete" onClick={onDelete} disabled={pending} title="Delete">x</button>
    </li>
  );
}

function MessageModal({ athlete, onClose }) {
  const [activeId, setActiveId] = useState("schedule");
  const [copied, setCopied] = useState(false);
  const list = templates(athlete);
  const active = list.find((t) => t.id === activeId) || list[0];
  const ref = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const copy = async () => {
    const text = taRef.current?.value ?? active.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      taRef.current?.select();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" ref={ref}>
        <div className="modal-header">
          <strong>Message templates - {athlete.name}</strong>
          <button className="icon-btn" onClick={onClose}>x</button>
        </div>
        <div className="template-tabs">
          {list.map((t) => (
            <button
              key={t.id}
              className={`tab ${t.id === active.id ? "active" : ""}`}
              onClick={() => setActiveId(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea ref={taRef} className="template-body" defaultValue={active.body} key={active.id} rows={6} />
        <div className="modal-actions">
          <button className="btn primary" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
    </div>
  );
}

function EditAthleteModal({ athlete, tracks, onClose }) {
  const [form, setForm] = useState({
    name: athlete.name || "",
    track: athlete.track || "9th",
    classOf: athlete.classOf ?? "",
    parents: (athlete.parents || []).map((p) => p.name).join(", "),
    mentorName: athlete.mentorName || "",
    mentorEmail: athlete.mentorEmail || "",
    athleteEmail: athlete.athleteEmail || "",
    parentEmails: (athlete.parentEmails || []).join(", "),
    calendarKeywords: (athlete.calendarKeywords || []).join(", "),
    driveFolderUrl: athlete.driveFolderUrl || "",
  });
  const [pending, startTransition] = useTransition();
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      track: form.track,
      classOf: form.classOf || null,
      parents: form.parents.split(",").map((s) => s.trim()).filter(Boolean),
      mentorName: form.mentorName || null,
      mentorEmail: form.mentorEmail || null,
      athleteEmail: form.athleteEmail || null,
      parentEmails: form.parentEmails.split(",").map((s) => s.trim()).filter(Boolean),
      calendarKeywords: form.calendarKeywords.split(",").map((s) => s.trim()).filter(Boolean),
      driveFolderUrl: form.driveFolderUrl || null,
    };
    startTransition(async () => {
      const result = await updateAthlete(athlete.id, payload);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      onClose();
    });
  };

  const trackOptions = tracks?.length
    ? tracks
    : [
        { id: "9th", label: "9th" },
        { id: "10th-roadmap", label: "10th - Roadmap" },
        { id: "11th-retainer", label: "11th / Retainer" },
      ];

  return (
    <div className="modal-backdrop">
      <div className="modal" ref={ref}>
        <div className="modal-header">
          <strong>Edit athlete - {athlete.name}</strong>
          <button className="icon-btn" onClick={onClose}>x</button>
        </div>
        <form onSubmit={submit} className="athlete-form">
          <label>
            Name <span className="req">*</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </label>
          <label>
            Track
            <select
              value={form.track}
              onChange={(e) => setForm({ ...form, track: e.target.value })}
            >
              {trackOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
          <label>
            Class of (year, optional)
            <input
              type="number"
              value={form.classOf}
              placeholder="e.g. 2028"
              onChange={(e) => setForm({ ...form, classOf: e.target.value })}
            />
          </label>
          <label>
            Parent name(s), comma-separated
            <input
              type="text"
              value={form.parents}
              onChange={(e) => setForm({ ...form, parents: e.target.value })}
            />
          </label>
          <label>
            Mentor name
            <input
              type="text"
              value={form.mentorName}
              onChange={(e) => setForm({ ...form, mentorName: e.target.value })}
            />
          </label>
          <label>
            Mentor email
            <input
              type="email"
              value={form.mentorEmail}
              onChange={(e) => setForm({ ...form, mentorEmail: e.target.value })}
            />
          </label>
          <label>
            Athlete email
            <input
              type="email"
              value={form.athleteEmail}
              onChange={(e) => setForm({ ...form, athleteEmail: e.target.value })}
            />
          </label>
          <label>
            Parent email(s), comma-separated
            <input
              type="text"
              value={form.parentEmails}
              onChange={(e) => setForm({ ...form, parentEmails: e.target.value })}
            />
          </label>
          <label>
            Calendar keywords, comma-separated
            <input
              type="text"
              value={form.calendarKeywords}
              placeholder="e.g. Sam, Tabib"
              onChange={(e) => setForm({ ...form, calendarKeywords: e.target.value })}
            />
          </label>
          <label>
            Drive folder URL
            <input
              type="url"
              value={form.driveFolderUrl}
              onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AthleteCard({ athlete, tracks }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addDeliverableOpen, setAddDeliverableOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const parents = athlete.parents.map((p) => p.name).join(" and ");
  const openCount = athlete.notes.filter((n) => !n.done).length;
  const isManual = athlete.lastMeetingSource === "manual";

  const onRemove = () => {
    if (!confirm(`Remove ${athlete.name}? Their notes will also be cleared.`)) return;
    startTransition(async () => {
      try {
        await removeAthlete(athlete.id);
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };

  const onMarkMeeting = () => {
    startTransition(async () => {
      try {
        await recordManualMeeting(athlete.id, new Date().toISOString());
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };

  const onClearManual = () => {
    if (!confirm("Clear manual meeting record? Will fall back to calendar data.")) return;
    startTransition(async () => {
      try {
        await clearManualMeeting(athlete.id);
      } catch (e) {
        alert(`Failed: ${e.message}`);
      }
    });
  };

  return (
    <div className={`athlete-card ${athlete.cardAlert} ${pending ? "pending" : ""}`}>
      <div className="card-head">
        <div>
          <button
            className="athlete-name name-button"
            onClick={() => setPopoverOpen((v) => !v)}
            title="Open notes"
          >
            {athlete.name}
            {openCount > 0 && <span className="note-badge">{openCount}</span>}
          </button>
          {athlete.mentorName && (
            <div className="athlete-mentor">
              <strong>Mentor:</strong> {athlete.mentorName}
            </div>
          )}
          {parents && (
            <div className="athlete-meta">Parent: {parents}</div>
          )}
        </div>
        <div className="card-actions">
          <button className="icon-btn" onClick={onMarkMeeting} title="Mark meeting today" disabled={pending}>met</button>
          <button className="icon-btn" onClick={() => setEditOpen(true)} title="Edit athlete info">edit</button>
          <button className="icon-btn" onClick={() => setMessagesOpen(true)} title="Message templates">msg</button>
          <button className="icon-btn" onClick={onRemove} title="Remove athlete" disabled={pending}>x</button>
        </div>
      </div>
      <div className="status-row">
        <MeetingPill athlete={athlete} />
        <NextMeetingPill athlete={athlete} />
        {isManual && (
          <button
            className="icon-btn pill-btn"
            onClick={onClearManual}
            disabled={pending}
            title="Clear manual record"
          >
            clear
          </button>
        )}
      </div>
      <div className="deliverables">
        {athlete.deliverables.length > 0 &&
          athlete.deliverables.map((d) => (
            <DeliverableRow key={d.id} athleteId={athlete.id} d={d} />
          ))}
        {addDeliverableOpen ? (
          <AddDeliverableForm
            athleteId={athlete.id}
            onClose={() => setAddDeliverableOpen(false)}
          />
        ) : (
          <button
            type="button"
            className="add-deliverable-btn"
            onClick={() => setAddDeliverableOpen(true)}
          >
            + add deliverable
          </button>
        )}
      </div>
      {popoverOpen && <NotesPopover athlete={athlete} onClose={() => setPopoverOpen(false)} />}
      {messagesOpen && <MessageModal athlete={athlete} onClose={() => setMessagesOpen(false)} />}
      {editOpen && <EditAthleteModal athlete={athlete} tracks={tracks} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
