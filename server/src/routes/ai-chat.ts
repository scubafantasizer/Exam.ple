import { Router, type IRouter } from "express";
import { db, settingsTable, topicsTable, examsTable, wrongAnswersTable } from "@shared/db";
import { AiChatBody, AiChatResponse } from "@shared/api-zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const settingsRows = await db.select().from(settingsTable).limit(1);
  const apiKey = settingsRows[0]?.geminiApiKey;
  if (!apiKey) {
    res.status(400).json({ error: "Gemini API anahtarı ayarlanmamış. Lütfen Ayarlar sayfasından API anahtarınızı ekleyin." });
    return;
  }

  const ctx = parsed.data.context;
  const userName = ctx?.userName ?? settingsRows[0]?.userName ?? null;
  const studyGoal = ctx?.studyGoal ?? settingsRows[0]?.studyGoal ?? null;

  let topicCount = ctx?.topicCount ?? 0;
  let examCount = ctx?.examCount ?? 0;
  let wrongAnswerCount = ctx?.wrongAnswerCount ?? 0;

  if (!ctx) {
    const [topics, exams, wrongAnswers] = await Promise.all([
      db.select().from(topicsTable),
      db.select().from(examsTable),
      db.select().from(wrongAnswersTable).where(eq(wrongAnswersTable.isCorrected, false)),
    ]);
    topicCount = topics.length;
    examCount = exams.length;
    wrongAnswerCount = wrongAnswers.length;
  }

  const currentPage = ctx?.currentPage ?? "ana sayfa";

  const systemPrompt = `Sen "exam.ple" adlı kişisel çalışma asistanısın. Öğrencilerin sınav hazırlığında yardım ediyorsun.

${userName ? `Öğrencinin adı: ${userName}` : ""}
${studyGoal ? `Hedef: ${studyGoal}` : ""}
Uygulama durumu:
- Takip edilen konu sayısı: ${topicCount}
- Yüklenen deneme sayısı: ${examCount}
- Aktif hata sayısı: ${wrongAnswerCount}
- Şu an görüntülenen sayfa: ${currentPage}

Görevlerin:
1. Çalışma planları ve ders programları oluştur (markdown tablo formatında).
2. Notlar ve listeler oluştur.
3. Konulara göre tavsiyeler ver.
4. Öğrencinin güçlü ve zayıf yönlerini analiz et.
5. Motivasyonu yüksek tut.

Eğer kullanıcı bir program, tablo veya kaydetmek isteyeceği bir içerik isterse, yanıtının sonunda şu formatta özel bir blok ekle:
===KAYDET===
BAŞLIK: [başlık]
TÜR: [note|table|schedule|list]
===SON===

Bu blok sadece içerik kaydedilmesi gerektiğinde olsun. Türkçe yanıt ver.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // exam.ple-style Tiered Routing
    const modelName = "gemini-3.1-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelName });

    const historyLimit = 15;
    const slicedHistory = (parsed.data.history ?? []).slice(-historyLimit);

    const rawHistory = slicedHistory.map((m: any) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.content }],
    }));

    const history: any[] = [];
    let lastRole: string | null = null;
    
    for (const h of rawHistory) {
      if (h.role === lastRole) {
        history[history.length - 1].parts[0].text += "\n" + h.parts[0].text;
      } else {
        history.push(h);
        lastRole = h.role;
      }
    }

    // Ensure alternating start
    if (history.length > 0 && history[0].role === "model") {
      history.unshift({ role: "user", parts: [{ text: "[Sistem Bağlantısı]" }] });
    }

    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
    });

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

    const result = await callWithRetry(() => chat.sendMessage(parsed.data.message));
    const fullText = result.response.text();

    let reply = fullText;
    let suggestedNote: { title: string; content: string; type: "note" | "table" | "schedule" | "list" } | null = null;

    const saveMatch = fullText.match(/===KAYDET===\s*BAŞLIK:\s*(.+)\s*TÜR:\s*(note|table|schedule|list)\s*===SON===/s);
    if (saveMatch) {
      reply = fullText.replace(/===KAYDET===[\s\S]*?===SON===/g, "").trim();
      const noteTitle = saveMatch[1].trim();
      const noteType = saveMatch[2].trim() as "note" | "table" | "schedule" | "list";
      suggestedNote = {
        title: noteTitle,
        content: reply,
        type: noteType,
      };
    }

    res.json(AiChatResponse.parse({ reply, suggestedNote }));
  } catch (err: unknown) {
    const errText = err instanceof Error ? err.message : String(err);
    const isQuota = errText.includes("limit: 0") || errText.includes("quota exceeded") || (err as any)?.status === 429;
    
    let userFriendlyReply = "";
    if (isQuota) {
        userFriendlyReply = "⚠️ **API Kotası Doldu (429):** Günlük çalışma limitine ulaşıldı. \n\n**Detay:** " + (errText.slice(0, 200));
    } else {
        userFriendlyReply = `❌ **Hata:** ${errText}`;
    }

    res.json(AiChatResponse.parse({ reply: userFriendlyReply, suggestedNote: null }));
  }
});

export default router;
