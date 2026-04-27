"use client";

import { useState, useTransition } from "react";
import { addAthlete } from "@/lib/actions";

export default function AthleteForm({ tracks }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(defaults());

  function defaults() {
    return {
      name: "",
      track: "9th",
      classOf: "",
      parents: "",
      mentorName: "",
      mentorEmail: "",
      athleteEmail: "",
      parentEmails: "",
      driveFolderUrl: "",
    };
  }

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
      driveFolderUrl: form.driveFolderUrl || null,
    };
    startTransition(async () => {
      const result = await addAthlete(payload);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setForm(defaults());
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button className="btn add-athlete-btn" onClick={() => setOpen(true)}>
        + Add athlete
      </button>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <strong>Add athlete</strong>
          <button className="icon-btn" onClick={() => setOpen(false)}>x</button>
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
            <select value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })}>
              {tracks.map((t) => (
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
              placeholder="Shelly or Todd, Lauren"
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
            Drive folder URL
            <input
              type="url"
              value={form.driveFolderUrl}
              onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? "Saving..." : "Add athlete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
