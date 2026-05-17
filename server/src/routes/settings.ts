import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@shared/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@shared/api-zod";

const router: IRouter = Router();

async function ensureSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length === 0) {
    const [row] = await db.insert(settingsTable).values({ dailyStudyMinutes: 60 }).returning();
    return row;
  }
  return rows[0];
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await ensureSettings();
  const payload = {
    ...settings,
    hasApiKey: !!settings.geminiApiKey,
    geminiApiKey: settings.geminiApiKey ? "••••••••" : null,
  };
  res.json(GetSettingsResponse.parse(payload));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const current = await ensureSettings();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.geminiApiKey !== undefined) {
    updateData.geminiApiKey = parsed.data.geminiApiKey;
  }
  if (parsed.data.userName !== undefined) updateData.userName = parsed.data.userName;
  if (parsed.data.studyGoal !== undefined) updateData.studyGoal = parsed.data.studyGoal;
  if (parsed.data.dailyStudyMinutes !== undefined) updateData.dailyStudyMinutes = parsed.data.dailyStudyMinutes;

  const [updated] = await db
    .update(settingsTable)
    .set(updateData)
    .where(eq(settingsTable.id, current.id))
    .returning();

  const payload = {
    ...updated,
    hasApiKey: !!updated.geminiApiKey,
    geminiApiKey: updated.geminiApiKey ? "••••••••" : null,
  };
  res.json(UpdateSettingsResponse.parse(payload));
});

export default router;
