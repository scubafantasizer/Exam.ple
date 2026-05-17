import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notesTable } from "@shared/db";
import {
  ListNotesResponse,
  CreateNoteBody,
  UpdateNoteBody,
  UpdateNoteResponse,
  DeleteNoteResponse,
} from "@shared/api-zod";

const router: IRouter = Router();

function serializeNote(n: typeof notesTable.$inferSelect) {
  return { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
}

router.get("/notes", async (_req, res): Promise<void> => {
  const notes = await db.select().from(notesTable).orderBy(notesTable.updatedAt);
  res.json(ListNotesResponse.parse(notes.map(serializeNote)));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db.insert(notesTable).values({
    title: parsed.data.title,
    content: parsed.data.content ?? "",
    type: (parsed.data.type ?? "note") as "note" | "list" | "checklist",
  }).returning();
  res.status(201).json(ListNotesResponse.element.parse(serializeNote(note)));
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;

  const [note] = await db.update(notesTable).set(updateData).where(eq(notesTable.id, id)).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  res.json(UpdateNoteResponse.parse(serializeNote(note)));
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(notesTable).where(eq(notesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Note not found" }); return; }
  res.json(DeleteNoteResponse.parse({ success: true }));
});

export default router;
