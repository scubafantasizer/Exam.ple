import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, resourcesTable, topicsTable } from "@shared/db";
import {
  ListResourcesResponse,
  AddResourceBody,
  DeleteResourceResponse,
} from "@shared/api-zod";

const router: IRouter = Router();

function extractYoutubeInfo(url: string): { videoId: string | null; type: "video" | "playlist"; thumbnailUrl: string | null } {
  const playlistMatch = url.match(/[?&]list=([^&]+)/);
  if (playlistMatch) {
    return { videoId: null, type: "playlist", thumbnailUrl: null };
  }
  const videoMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (videoMatch) {
    const videoId = videoMatch[1];
    return {
      videoId,
      type: "video",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
  }
  return { videoId: null, type: "video", thumbnailUrl: null };
}

router.get("/resources", async (_req, res): Promise<void> => {
  const resources = await db.select().from(resourcesTable).orderBy(resourcesTable.createdAt);
  const topicIds = [...new Set(resources.map((r: any) => r.topicId).filter(Boolean))] as number[];
  const topicMap = new Map<number, string>();
  if (topicIds.length > 0) {
    const topics = await db.select().from(topicsTable);
    for (const t of topics) topicMap.set(t.id, t.name);
  }

  const result = resources.map((r: any) => ({
    ...r,
    topicName: r.topicId ? (topicMap.get(r.topicId) ?? null) : null,
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(ListResourcesResponse.parse(result));
});

router.post("/resources", async (req, res): Promise<void> => {
  const parsed = AddResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { videoId, type, thumbnailUrl } = extractYoutubeInfo(parsed.data.url);

  const [resource] = await db.insert(resourcesTable).values({
    url: parsed.data.url,
    title: parsed.data.title,
    type,
    thumbnailUrl,
    videoId,
    topicId: parsed.data.topicId ?? null,
    notes: null,
  }).returning();

  let topicName: string | null = null;
  if (resource.topicId) {
    const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, resource.topicId));
    topicName = topic?.name ?? null;
  }

  res.status(201).json(ListResourcesResponse.element.parse({
    ...resource,
    topicName,
    createdAt: resource.createdAt.toISOString(),
  }));
});

router.delete("/resources/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(resourcesTable).where(eq(resourcesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Resource not found" }); return; }
  res.json(DeleteResourceResponse.parse({ success: true }));
});

export default router;
