import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, topicsTable } from "@shared/db";
import {
  ListTopicsResponse,
  CreateTopicBody,
  UpdateTopicBody,
  UpdateTopicResponse,
  DeleteTopicResponse,
} from "@shared/api-zod";

const router: IRouter = Router();

function serializeTopic(t: typeof topicsTable.$inferSelect) {
  return { ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt?.toISOString() ?? t.createdAt.toISOString() };
}

router.get("/topics", async (_req, res): Promise<void> => {
  const topics = await db.select().from(topicsTable).orderBy(topicsTable.createdAt);
  res.json(ListTopicsResponse.parse(topics.map(serializeTopic)));
});

router.post("/topics", async (req, res): Promise<void> => {
  const parsed = CreateTopicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [topic] = await db.insert(topicsTable).values({
    name: parsed.data.name,
    subject: parsed.data.subject ?? null,
    progress: 0,
    status: "not_started",
  }).returning();
  res.status(201).json(ListTopicsResponse.element.parse(serializeTopic(topic)));
});

router.patch("/topics/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateTopicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.subject !== undefined) updateData.subject = parsed.data.subject;
  if (parsed.data.progress !== undefined) updateData.progress = parsed.data.progress;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [topic] = await db.update(topicsTable).set(updateData).where(eq(topicsTable.id, id)).returning();
  if (!topic) { res.status(404).json({ error: "Topic not found" }); return; }
  res.json(UpdateTopicResponse.parse(serializeTopic(topic)));
});

router.delete("/topics/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(topicsTable).where(eq(topicsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Topic not found" }); return; }
  res.json(DeleteTopicResponse.parse({ success: true }));
});

export default router;
