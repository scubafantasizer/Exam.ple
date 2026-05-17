import { Router, type IRouter } from "express";
import { count, eq, sql } from "drizzle-orm";
import { db, chatSessionsTable, chatMessagesTable, topicsTable, settingsTable } from "@shared/db";
import {
  ListChatSessionsResponse,
  CreateChatSessionBody,
  ListMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
} from "@shared/api-zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SKILLS_MD, FUNCTION_DECLARATIONS, executeFunction, ActionPerformed, AVAILABLE_MODELS, SYSTEM_INSTRUCTION_SUFFIX } from "../lib/agent-core";

const router: IRouter = Router();

router.get("/chat/sessions", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(chatSessionsTable).orderBy(chatSessionsTable.updatedAt);

  const messageCounts: Record<number, number> = {};
  if (sessions.length > 0) {
    const counts = await db
      .select({ sessionId: chatMessagesTable.sessionId, count: count() })
      .from(chatMessagesTable)
      .groupBy(chatMessagesTable.sessionId);
    for (const row of counts) messageCounts[row.sessionId] = row.count;
  }

  const topicMap = new Map<number, string>();
  const topicIds = [...new Set(sessions.map((s: any) => s.topicId).filter(Boolean))] as number[];
  if (topicIds.length > 0) {
    const topics = await db.select().from(topicsTable);
    for (const t of topics) topicMap.set(t.id, t.name);
  }

  res.json(ListChatSessionsResponse.parse(sessions.map((s: any) => ({
    ...s,
    messageCount: messageCounts[s.id] ?? 0,
    topicName: s.topicId ? (topicMap.get(s.topicId) ?? null) : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))));
});

router.post("/chat/sessions", async (req, res): Promise<void> => {
  const parsed = CreateChatSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.title === "Brain Agent") {
    const existing = await db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.title, "Brain Agent"))
      .limit(1);
    
    if (existing[0]) {
      const s = existing[0];
      let topicName: string | null = null;
      if (s.topicId) {
        const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, s.topicId));
        topicName = topic?.name ?? null;
      }
      res.json(ListChatSessionsResponse.element.parse({
        ...s,
        messageCount: 0, 
        topicName,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));
      return;
    }
  }

  const [session] = await db.insert(chatSessionsTable).values({
    title: parsed.data.title,
    topicId: parsed.data.topicId ?? null,
  }).returning();

  let topicName: string | null = null;
  if (session.topicId) {
    const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, session.topicId));
    topicName = topic?.name ?? null;
  }

  res.status(201).json(ListChatSessionsResponse.element.parse({
    ...session,
    messageCount: 0,
    topicName,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }));
});

router.get("/chat/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId, 10);
  if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(chatMessagesTable.createdAt);

  res.json(ListMessagesResponse.parse(messages.map((m: any) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }))));
});

router.post("/chat/sessions/:sessionId/messages", async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId, 10);
  if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const settingsRows = await db.select().from(settingsTable).limit(1);
  const apiKey = settingsRows[0]?.geminiApiKey;
  if (!apiKey) {
    res.status(400).json({ error: "Gemini API anahtarı ayarlanmamış. Lütfen Ayarlar sayfasından API anahtarınızı ekleyin." });
    return;
  }

  const [lastMessage] = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(sql`${chatMessagesTable.createdAt} DESC`)
    .limit(1);

  if (lastMessage && lastMessage.role === "user" && lastMessage.content === parsed.data.content && (Date.now() - lastMessage.createdAt.getTime()) < 5000) {
     res.status(409).json({ error: "Lütfen bekleyin, mesajınız işleniyor." });
     return;
  }

  const [userMessage] = await db.insert(chatMessagesTable).values({
    sessionId,
    role: "user",
    content: parsed.data.content,
  }).returning();

  const session = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.id, sessionId)).limit(1);
  const sessionData = session[0];
  let topicContext = "";
  if (sessionData?.topicId) {
    const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, sessionData.topicId));
    if (topic) topicContext = `Konu: ${topic.name}${topic.subject ? ` (${topic.subject})` : ""}. `;
  }

  const history = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(chatMessagesTable.createdAt);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = `${SKILLS_MD}
    
    Sen bir kişisel ders koçusun. Türk öğrencilere sınav hazırlığında yardım ediyorsun. ${topicContext}Öğrencilerin sorularını anlayışlı, net ve motive edici bir şekilde yanıtla. Açıklamalarında somut örnekler kullan ve gerektiğinde adım adım çözümler sun. Türkçe yanıt ver.
    
    ${SYSTEM_INSTRUCTION_SUFFIX}`;
    
    // Tiered Routing Logic
    let model: any = null;
    let successfulModelName = "";
    
    for (const mName of AVAILABLE_MODELS) {
        try {
            const m = genAI.getGenerativeModel({ 
                model: mName, 
                systemInstruction: systemPrompt,
                tools: [{ functionDeclarations: FUNCTION_DECLARATIONS as any }] 
            });
            // Test if model exists (quick cheap test or just assume)
            model = m;
            successfulModelName = mName;
            break;
        } catch (e) {
            console.warn(`Model ${mName} initialization failed, trying next...`);
        }
    }

    if (!model) throw new Error("Hiçbir Gemini modeli çalıştırılamadı.");

    // Strict History Sanitization & Capping (exam.ple Logic)
    const historyLimit = 15;
    const slicedHistory = history.slice(0, -1).slice(-historyLimit);
    
    const rawHistory = slicedHistory.map((m: any) => ({
        role: m.role === "user" ? "user" as const : "model" as const,
        parts: [{ text: m.content }],
    }));

    const chatHistory: any[] = [];
    let lastHistoryRole: string | null = null;
    for (const h of rawHistory) {
      if (h.role === lastHistoryRole) {
        chatHistory[chatHistory.length - 1].parts[0].text += "\n" + h.parts[0].text;
      } else {
        chatHistory.push(h);
        lastHistoryRole = h.role;
      }
    }

    if (chatHistory.length > 0 && chatHistory[0].role === "model") {
      chatHistory.unshift({ role: "user", parts: [{ text: "[Sistem Bağlantısı]" }] });
    }

    const callWithRetry = async (fn: () => Promise<any>, maxRetries = 3): Promise<any> => {
      for (let i = 0; i < maxRetries; i++) {
          try {
              return await fn();
          } catch (err: any) {
              const errText = String(err?.message ?? "");
              if (errText.includes("limit: 0") || errText.includes("quota exceeded") || errText.includes("Quota exceeded")) {
                  throw err;
              }
              if (err.status === 429 && i < maxRetries - 1) {
                  const retrySec = 5 * Math.pow(2, i);
                  await new Promise(r => setTimeout(r, retrySec * 1000));
                  continue;
              }
              throw err;
          }
      }
    };

    const chat = model.startChat({ history: chatHistory });
    const actionsPerformed: ActionPerformed[] = [];
    let candidate = await callWithRetry(() => chat.sendMessage(parsed.data.content));
    let lastResponse = candidate.response;
    let turns = 0;
    let aiText = "";

    while (turns < 3) {
      const functionCalls = lastResponse.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const functionResponses: any[] = [];
        for (const call of functionCalls) {
          const { result, action } = await executeFunction(
            call.name,
            call.args as Record<string, unknown>,
            sessionId
          );
          if (action) actionsPerformed.push(action);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result },
            },
          });
        }
        const nextResult = await callWithRetry(() => chat.sendMessage(functionResponses));
        lastResponse = nextResult.response;
        turns++;
      } else {
        try {
          aiText = lastResponse.text() || "";
        } catch (e) {
          aiText = "İşlem tamamlandı.";
        }
        break;
      }
    }

    const [aiMessage] = await db.insert(chatMessagesTable).values({
      sessionId,
      role: "model",
      content: aiText,
    }).returning();

    await db.update(chatSessionsTable).set({ updatedAt: new Date() }).where(eq(chatSessionsTable.id, sessionId));

    res.json(SendMessageResponse.parse({
      id: aiMessage.id,
      sessionId: aiMessage.sessionId,
      role: "model",
      content: aiText,
      createdAt: aiMessage.createdAt.toISOString(),
    }));
  } catch (err: unknown) {
    const errText = err instanceof Error ? err.message : String(err);
    const isQuota = errText.includes("limit: 0") || errText.includes("quota exceeded") || (err as any)?.status === 429;
    
    let userFriendlyReply = "";
    if (isQuota) {
        userFriendlyReply = "⚠️ **API Kotası Doldu (429):** Şu an cevap veremiyorum çünkü günlük limitim doldu. \n\n**Detay:** " + (errText.slice(0, 200));
    } else {
        userFriendlyReply = `❌ **Hata:** ${errText}`;
    }

    if (sessionId) {
        await db.insert(chatMessagesTable).values({
            sessionId,
            role: "model",
            content: userFriendlyReply,
        });
    }
    
    res.status(200).json(SendMessageResponse.parse({
        id: -1,
        sessionId,
        role: "model",
        content: userFriendlyReply,
        createdAt: new Date().toISOString(),
    }));
  }
});

router.delete("/chat/sessions/:sessionId", async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.sessionId, 10);
  if (isNaN(sessionId)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.sessionId, sessionId));
  const [deleted] = await db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, sessionId)).returning();

  if (!deleted) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ success: true });
});

export default router;
