import { Router, type IRouter } from "express";
import { count, sql } from "drizzle-orm";
import { db, topicsTable, resourcesTable, chatSessionsTable, chatMessagesTable, settingsTable } from "@shared/db";
import { GetDashboardSummaryResponse } from "@shared/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [topics, resources, sessions, settings] = await Promise.all([
    db.select().from(topicsTable),
    db.select().from(resourcesTable),
    db.select().from(chatSessionsTable).orderBy(chatSessionsTable.updatedAt),
    db.select().from(settingsTable).limit(1),
  ]);

  const messageCounts: Record<number, number> = {};
  if (sessions.length > 0) {
    const counts = await db
      .select({ sessionId: chatMessagesTable.sessionId, count: count() })
      .from(chatMessagesTable)
      .groupBy(chatMessagesTable.sessionId);
    for (const row of counts) messageCounts[row.sessionId] = row.count;
  }

  const recentSessions = sessions.slice(-5).reverse().map((s: any) => ({
    ...s,
    messageCount: messageCounts[s.id] ?? 0,
    topicName: null as string | null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const topicProgress = topics.slice(0, 10).map((t: any) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  const summary = {
    totalTopics: topics.length,
    completedTopics: topics.filter((t: any) => t.status === "completed").length,
    inProgressTopics: topics.filter((t: any) => t.status === "in_progress").length,
    totalResources: resources.length,
    totalChatSessions: sessions.length,
    hasApiKey: !!(settings[0]?.geminiApiKey),
    recentSessions,
    topicProgress,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
