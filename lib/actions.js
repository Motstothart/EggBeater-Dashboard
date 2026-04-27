"use server";

import { revalidatePath } from "next/cache";
import { mutateJsonFile } from "./github";

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function addNote(athleteId, text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { ok: false, error: "Note is empty" };
  await mutateJsonFile(
    "data/actions.json",
    (data) => {
      data.athleteNotes ??= {};
      data.athleteNotes[athleteId] ??= [];
      data.athleteNotes[athleteId].unshift({
        id: newId("note"),
        text: trimmed,
        done: false,
        createdAt: new Date().toISOString(),
        doneAt: null,
      });
    },
    `Add note for ${athleteId}`
  );
  revalidatePath("/");
  return { ok: true };
}

export async function toggleNote(athleteId, noteId) {
  await mutateJsonFile(
    "data/actions.json",
    (data) => {
      const notes = data.athleteNotes?.[athleteId];
      if (!notes) return;
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      note.done = !note.done;
      note.doneAt = note.done ? new Date().toISOString() : null;
    },
    `Toggle note for ${athleteId}`
  );
  revalidatePath("/");
  return { ok: true };
}

export async function deleteNote(athleteId, noteId) {
  await mutateJsonFile(
    "data/actions.json",
    (data) => {
      if (!data.athleteNotes?.[athleteId]) return;
      data.athleteNotes[athleteId] = data.athleteNotes[athleteId].filter((n) => n.id !== noteId);
    },
    `Delete note for ${athleteId}`
  );
  revalidatePath("/");
  return { ok: true };
}

export async function toggleDeliverable(athleteId, deliverableId) {
  await mutateJsonFile(
    "data/roster.json",
    (data) => {
      const athlete = data.athletes.find((a) => a.id === athleteId);
      if (!athlete) return;
      const d = athlete.deliverables?.find((x) => x.id === deliverableId);
      if (!d) return;
      const willBeDone = d.status !== "done";
      d.status = willBeDone ? "done" : "pending";
      d.completedAt = willBeDone ? new Date().toISOString() : null;
    },
    `Toggle deliverable ${deliverableId}`
  );
  revalidatePath("/");
  return { ok: true };
}

export async function addAthlete(input) {
  const name = (input.name || "").trim();
  if (!name) return { ok: false, error: "Name is required" };
  const id = slugify(name);
  if (!id) return { ok: false, error: "Could not derive an id from that name" };
  const track = input.track;
  if (!["9th", "10th-roadmap", "11th-retainer"].includes(track)) {
    return { ok: false, error: "Invalid track" };
  }
  let conflict = false;
  await mutateJsonFile(
    "data/roster.json",
    (data) => {
      if (data.athletes.some((a) => a.id === id)) {
        conflict = true;
        return;
      }
      data.athletes.push({
        id,
        name,
        track,
        classOf: input.classOf ? Number(input.classOf) : null,
        parents: (input.parents || []).filter((p) => p && p.trim()).map((n) => ({ name: n.trim() })),
        mentorName: input.mentorName?.trim() || null,
        mentorEmail: input.mentorEmail?.trim() || null,
        athleteEmail: input.athleteEmail?.trim() || null,
        parentEmails: (input.parentEmails || []).filter((e) => e && e.trim()).map((e) => e.trim()),
        driveFolderUrl: input.driveFolderUrl?.trim() || null,
        deliverables: [],
      });
    },
    `Add athlete ${name}`
  );
  if (conflict) return { ok: false, error: `Athlete with id "${id}" already exists` };
  revalidatePath("/");
  return { ok: true };
}

export async function removeAthlete(athleteId) {
  await mutateJsonFile(
    "data/roster.json",
    (data) => {
      data.athletes = data.athletes.filter((a) => a.id !== athleteId);
    },
    `Remove athlete ${athleteId}`
  );
  await mutateJsonFile(
    "data/actions.json",
    (data) => {
      if (data.athleteNotes) delete data.athleteNotes[athleteId];
    },
    `Clean notes for removed athlete ${athleteId}`
  );
  revalidatePath("/");
  return { ok: true };
}

export async function addPunchListItem(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return { ok: false, error: "Empty" };
  await mutateJsonFile(
    "data/actions.json",
    (data) => {
      data.punchList ??= [];
      data.punchList.unshift({
        id: newId("punch"),
        text: trimmed,
        createdAt: new Date().toISOString(),
      });
    },
    "Add punch list item"
  );
  revalidatePath("/");
  return { ok: true };
}

export async function completePunchListItem(itemId) {
  await mutateJsonFile(
    "data/actions.json",
    (data) => {
      const idx = (data.punchList || []).findIndex((i) => i.id === itemId);
      if (idx === -1) return;
      const [item] = data.punchList.splice(idx, 1);
      data.completed ??= [];
      data.completed.unshift({ ...item, completedAt: new Date().toISOString() });
    },
    `Complete punch item ${itemId}`
  );
  revalidatePath("/");
  return { ok: true };
}
