import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, wrongAnswersTable, topicsTable } from "@shared/db";
import {
  ListWrongAnswersResponse,
  CreateWrongAnswerBody,
  UpdateWrongAnswerBody,
  UpdateWrongAnswerResponse,
  DeleteWrongAnswerResponse,
} from "@shared/api-zod";

const router: IRouter = Router();

const CORRECTION_DAYS = 14;

async function autoCorrectStale() {
  const cutoff = new Date(Date.now() - CORRECTION_DAYS * 24 * 60 * 60 * 1000);
  const stale = await db.select().from(wrongAnswersTable).where(eq(wrongAnswersTable.isCorrected, false));
  for (const wa of stale) {
    const lastActivity = wa.lastSeenAt ?? wa.createdAt;
    if (lastActivity < cutoff) {
      await db.update(wrongAnswersTable).set({ isCorrected: true, correctedAt: new Date() }).where(eq(wrongAnswersTable.id, wa.id));
    }
  }
}

function serializeWA(r: typeof wrongAnswersTable.$inferSelect, topicName: string | null = null) {
  return {
    ...r,
    topicName,
    correctedAt: r.correctedAt?.toISOString() ?? null,
    lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/wrong-answers", async (_req, res): Promise<void> => {
  await autoCorrectStale();
  const rows = await db.select().from(wrongAnswersTable).orderBy(wrongAnswersTable.createdAt);
  const topicMap = new Map<number, string>();
  if (rows.some((r: any) => r.topicId)) {
    const topics = await db.select().from(topicsTable);
    for (const t of topics) topicMap.set(t.id, t.name);
  }
  res.json(ListWrongAnswersResponse.parse(rows.map((r: any) => serializeWA(r, r.topicId ? (topicMap.get(r.topicId) ?? null) : null))));
});

router.post("/wrong-answers", async (req, res): Promise<void> => {
  const parsed = CreateWrongAnswerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(wrongAnswersTable).values({
    questionText: parsed.data.questionText,
    type: (parsed.data.type ?? "wrong") as "wrong" | "blank",
    topicId: parsed.data.topicId ?? null,
    examId: parsed.data.examId ?? null,
    notes: parsed.data.notes ?? null,
    isCorrected: false,
    lastSeenAt: new Date(),
  }).returning();

  let topicName: string | null = null;
  if (row.topicId) {
    const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, row.topicId));
    topicName = topic?.name ?? null;
  }
  res.status(201).json(ListWrongAnswersResponse.element.parse(serializeWA(row, topicName)));
});

router.patch("/wrong-answers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = UpdateWrongAnswerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.isCorrected !== undefined) {
    updateData.isCorrected = parsed.data.isCorrected;
    if (parsed.data.isCorrected) updateData.correctedAt = new Date();
  }
  if (parsed.data.lastSeenAt !== undefined) {
    updateData.lastSeenAt = parsed.data.lastSeenAt ? new Date(parsed.data.lastSeenAt) : new Date();
  }

  const [row] = await db.update(wrongAnswersTable).set(updateData).where(eq(wrongAnswersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  let topicName: string | null = null;
  if (row.topicId) {
    const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, row.topicId));
    topicName = topic?.name ?? null;
  }
  res.json(UpdateWrongAnswerResponse.parse(serializeWA(row, topicName)));
});

router.delete("/wrong-answers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(wrongAnswersTable).where(eq(wrongAnswersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json(DeleteWrongAnswerResponse.parse({ success: true }));
});

export default router;
