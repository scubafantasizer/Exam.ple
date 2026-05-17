import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, examsTable, examQuestionsTable, topicsTable, settingsTable, wrongAnswersTable } from "@shared/db";
import {
  ListExamsResponse,
  CreateExamBody,
  DeleteExamResponse,
  SaveExamQuestionsBody,
} from "@shared/api-zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();

function computeCounts(questions: { status: string }[]) {
  return {
    wrongCount: questions.filter((q: any) => q.status === "wrong").length,
    blankCount: questions.filter((q: any) => q.status === "blank").length,
    correctCount: questions.filter((q: any) => q.status === "correct").length,
  };
}

async function buildExamPayload(examId: number) {
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) return null;

  const questions = await db
    .select()
    .from(examQuestionsTable)
    .where(eq(examQuestionsTable.examId, examId))
    .orderBy(examQuestionsTable.questionNumber);

  let topicName: string | null = null;
  if (exam.topicId) {
    const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, exam.topicId));
    topicName = topic?.name ?? null;
  }

  return {
    ...exam,
    ...computeCounts(questions),
    hasPdf: !!exam.pdfBase64,
    pdfBase64: undefined,
    topicName,
    createdAt: exam.createdAt.toISOString(),
    questions,
  };
}

router.get("/exams", async (_req, res): Promise<void> => {
  const exams = await db.select().from(examsTable).orderBy(examsTable.createdAt);

  const result = await Promise.all(exams.map(async (exam: any) => {
    const questions = await db.select().from(examQuestionsTable).where(eq(examQuestionsTable.examId, exam.id));
    let topicName: string | null = null;
    if (exam.topicId) {
      const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, exam.topicId));
      topicName = topic?.name ?? null;
    }
    return { ...exam, ...computeCounts(questions), hasPdf: !!exam.pdfBase64, topicName, createdAt: exam.createdAt.toISOString() };
  }));

  res.json(ListExamsResponse.parse(result));
});

router.post("/exams", async (req, res): Promise<void> => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [exam] = await db.insert(examsTable).values({
    title: parsed.data.title,
    publisher: parsed.data.publisher ?? null,
    topicId: parsed.data.topicId ?? null,
    totalQuestions: parsed.data.totalQuestions,
    pdfBase64: parsed.data.pdfBase64 ?? null,
  }).returning();

  const questions = Array.from({ length: exam.totalQuestions }, (_, i) => ({
    examId: exam.id,
    questionNumber: i + 1,
    status: "correct" as const,
    notes: null as string | null,
  }));
  if (questions.length > 0) await db.insert(examQuestionsTable).values(questions);

  const payload = await buildExamPayload(exam.id);
  res.status(201).json(payload);
});

router.get("/exams/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const payload = await buildExamPayload(id);
  if (!payload) { res.status(404).json({ error: "Exam not found" }); return; }
  res.json(payload);
});

router.delete("/exams/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(examQuestionsTable).where(eq(examQuestionsTable.examId, id));
  const [deleted] = await db.delete(examsTable).where(eq(examsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Exam not found" }); return; }
  res.json(DeleteExamResponse.parse({ success: true }));
});

router.put("/exams/:id/questions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = SaveExamQuestionsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const exam = await db.select().from(examsTable).where(eq(examsTable.id, id)).limit(1);
  if (!exam[0]) { res.status(404).json({ error: "Exam not found" }); return; }

  for (const q of parsed.data.questions) {
    await db
      .update(examQuestionsTable)
      .set({ status: q.status, notes: q.notes ?? null })
      .where(and(eq(examQuestionsTable.examId, id), eq(examQuestionsTable.questionNumber, q.questionNumber)));
  }

  const wrongAndBlank = parsed.data.questions.filter((q: any) => q.status === "wrong" || q.status === "blank");
  for (const q of wrongAndBlank) {
    const existing = await db
      .select()
      .from(wrongAnswersTable)
      .where(and(eq(wrongAnswersTable.examId, id), sql`${wrongAnswersTable.questionText} = ${"Soru " + q.questionNumber}`))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(wrongAnswersTable).values({
        questionText: `Soru ${q.questionNumber}`,
        type: q.status as "wrong" | "blank",
        topicId: exam[0].topicId ?? null,
        examId: id,
        notes: q.notes ?? null,
        isCorrected: false,
        lastSeenAt: new Date(),
      });
    } else {
      await db.update(wrongAnswersTable).set({ lastSeenAt: new Date(), isCorrected: false, correctedAt: null }).where(eq(wrongAnswersTable.id, existing[0].id));
    }
  }

  const payload = await buildExamPayload(id);
  res.json(payload);
});

router.post("/exams/:id/analyze", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const settingsRows = await db.select().from(settingsTable).limit(1);
  const apiKey = settingsRows[0]?.geminiApiKey;
  if (!apiKey) { res.status(400).json({ error: "Gemini API anahtarı ayarlanmamış." }); return; }

  const payload = await buildExamPayload(id);
  if (!payload) { res.status(404).json({ error: "Exam not found" }); return; }

  const wrongQs = payload.questions.filter((q: any) => q.status === "wrong").map((q: any) => `Soru ${q.questionNumber}`);
  const blankQs = payload.questions.filter((q: any) => q.status === "blank").map((q: any) => `Soru ${q.questionNumber}`);

  const prompt = `Bir öğrenci "${payload.title}" sınavını çözdü.
Sınav bilgileri:
- Yayıncı: ${payload.publisher ?? "Belirtilmemiş"}
- Toplam soru: ${payload.totalQuestions}
- Konu: ${payload.topicName ?? "Genel"}
- Doğru: ${payload.correctCount}
- Yanlış: ${payload.wrongCount} (${wrongQs.join(", ") || "yok"})
- Boş: ${payload.blankCount} (${blankQs.join(", ") || "yok"})

Bu sonuçlara bakarak:
1. Öğrencinin genel performansını değerlendir.
2. Özellikle hangi konularda/soru tiplerinde eksik olduğunu analiz et.
3. Hangi konulara öncelik vermesi gerektiğini belirt.
4. Motivasyonu yüksek tutacak somut 3-4 tavsiye ver.

Türkçe, net ve yapıcı bir şekilde yanıt ver.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    if (payload.hasPdf) {
      const [fullExam] = await db.select().from(examsTable).where(eq(examsTable.id, id));
      if (fullExam?.pdfBase64) {
        const pdfData = fullExam.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
        const pdfResult = await model.generateContent([{ inlineData: { data: pdfData, mimeType: "application/pdf" } }, prompt]);
        const text = pdfResult.response.text();
        await db.update(examsTable).set({ analysisResult: text }).where(eq(examsTable.id, id));
        res.json({ analysis: text, weakTopics: [], recommendations: [] });
        return;
      }
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    await db.update(examsTable).set({ analysisResult: text }).where(eq(examsTable.id, id));
    res.json({ analysis: text, weakTopics: [], recommendations: [] });
  } catch (err: unknown) {
    const errText = err instanceof Error ? err.message : String(err);
    const isQuota = errText.includes("limit: 0") || errText.includes("quota exceeded") || (err as any)?.status === 429;
    
    if (isQuota) {
      res.status(429).json({
        error: `⚠️ API Kotası Doldu (429). Detay: ${errText.slice(0, 200)}`,
      });
    } else {
      res.status(500).json({ error: `❌ AI Hatası: ${errText}` });
    }
  }
});

export default router;
