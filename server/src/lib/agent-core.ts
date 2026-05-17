
import { 
  db, 
  topicsTable, 
  wrongAnswersTable, 
  notesTable, 
  examsTable, 
  resourcesTable, 
  chatSessionsTable,
  chatMessagesTable,
  settingsTable
} from "@shared/db";
import { SchemaType } from "@google/generative-ai";
import { eq, sql } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const potentialSkillsPaths = [
  join(__dirname, "../ai-skills.md"),
  join(__dirname, "../../ai-skills.md"),
  join(__dirname, "../../../src/ai-skills.md"),
];

let SKILLS_MD = "";
for (const p of potentialSkillsPaths) {
  if (existsSync(p)) {
    SKILLS_MD = readFileSync(p, "utf-8");
    break;
  }
}

export { SKILLS_MD };

export const AVAILABLE_MODELS = [
  "gemini-3.1-flash-lite",
];

export const SYSTEM_INSTRUCTION_SUFFIX = `
CORE DIRECTIVE: Her zaman araçları (tools) kullanmaya hazır ol. 
DİKKAT: Kullanıcı 'sil', 'temizle', 'reset', 'kaldır' gibi bir istekte bulunursa ASLA sadece metinle cevap verme. 
MUTLAKA ilgili silme aracını (tool) çağır. Önce sil, sonra sonucunu raporla.
Sistemdeki notları, konuları veya dosyaları silmek için ilgili ID'leri get_study_status ile kontrol etmeyi unutma.`;

export const FUNCTION_DECLARATIONS = [
  {
    name: "create_topic",
    description: "Öğrencinin takip listesine yeni bir çalışma konusu ekle",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Konunun adı, örn: Logaritma, Türev" },
        subject: { type: SchemaType.STRING, description: "Ders adı, örn: Matematik, Fizik" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_topic_progress",
    description: "Bir konunun ilerleme yüzdesini (0-100) ve durumunu güncelle",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topicId: { type: SchemaType.NUMBER, description: "Güncellenecek konunun ID'si" },
        progress: { type: SchemaType.NUMBER, description: "0-100 arası ilerleme yüzdesi" },
        status: {
          type: SchemaType.STRING,
          enum: ["not_started", "in_progress", "completed"],
          description: "Konunun durumu",
        },
      },
      required: ["topicId"],
    },
  },
  {
    name: "delete_topic",
    description: "Bir konuyu sistemden sil",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topicId: { type: SchemaType.NUMBER, description: "Silinecek konunun ID'si" },
      },
      required: ["topicId"],
    },
  },
  {
    name: "create_note",
    description: "Markdown formatında not, tablo, liste veya ders programı oluştur ve Listeler'e kaydet",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "İçeriğin başlığı" },
        content: { type: SchemaType.STRING, description: "Markdown formatında içerik." },
        type: { type: SchemaType.STRING, enum: ["note", "table", "schedule", "list"], description: "İçerik türü" },
      },
      required: ["title", "content", "type"],
    },
  },
  {
    name: "delete_note",
    description: "Bir notu sistemden sil",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        noteId: { type: SchemaType.NUMBER, description: "Silinecek notun ID'si" },
      },
      required: ["noteId"],
    },
  },
  {
    name: "track_wrong_answer",
    description: "Öğrencinin yanlış yaptığı veya boş bıraktığı bir soruyu kaydet.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        questionText: { type: SchemaType.STRING, description: "Sorunun metni" },
        type: { type: SchemaType.STRING, enum: ["wrong", "blank"], description: "Hata türü" },
        topicId: { type: SchemaType.NUMBER, description: "İlgili konunun ID'si" },
      },
      required: ["questionText", "type"],
    },
  },
  {
    name: "delete_wrong_answer",
    description: "Bir yanlış cevabı veya sistemdeki hatayı sil",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        wrongAnswerId: { type: SchemaType.NUMBER, description: "Silinecek yanlış cevabın ID'si" },
      },
      required: ["wrongAnswerId"],
    },
  },
  {
    name: "clear_chat_history",
    description: "Geçmiş sohbeti ve oturum konuşmalarını temizle",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "create_gap_analysis",
    description: "Öğrencinin tüm yanlışlarını analiz ederek konu bazında bir eksik tablosu oluştur",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "delete_exam",
    description: "Sistemdeki bir deneme sınavını sil",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        examId: { type: SchemaType.NUMBER, description: "Silinecek denemenin ID'si" },
      },
      required: ["examId"],
    },
  },
  {
    name: "delete_resource",
    description: "Sistemdeki bir kaynağı sil",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        resourceId: { type: SchemaType.NUMBER, description: "Silinecek kaynağın ID'si" },
      },
      required: ["resourceId"],
    },
  },
  {
    name: "delete_chat_session",
    description: "Belirli bir sohbet oturumunu sil",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sessionId: { type: SchemaType.NUMBER, description: "Silinecek oturumun ID'si" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "update_settings",
    description: "Genel ayarları güncelle",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        userName: { type: SchemaType.STRING },
        studyGoal: { type: SchemaType.STRING },
        dailyStudyMinutes: { type: SchemaType.NUMBER },
      },
    },
  },
  {
    name: "list_workspace_files",
    description: "Dosyaları listele",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: { type: SchemaType.STRING },
      },
    },
  },
  {
    name: "read_workspace_file",
    description: "Dosya içeriğini oku",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: { type: SchemaType.STRING },
      },
      required: ["filePath"],
    },
  },
  {
    name: "delete_workspace_file",
    description: "Dosyayı kalıcı olarak sil",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: { type: SchemaType.STRING },
      },
      required: ["filePath"],
    },
  },
  {
    name: "execute_workspace_command",
    description: "Bash komutu çalıştır (ls, npm, grep, rm)",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: { type: SchemaType.STRING },
      },
      required: ["command"],
    },
  },
  {
    name: "analyze_overall_mastery",
    description: "Genel durum raporu oluştur",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "clear_all_data",
    description: "TÜM verileri temizle ve sıfırla",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

export type ActionPerformed = {
  action: string;
  description: string;
  resultId?: number | null;
};

export async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  sessionId?: number
): Promise<{ result: string; action?: ActionPerformed }> {
  switch (name) {
    case "create_topic": {
      const [topic] = await db.insert(topicsTable).values({
        name: String(args.name),
        subject: args.subject ? String(args.subject) : null,
        progress: 0,
        status: "not_started",
      }).returning();
      return { result: "Başarılı", action: { action: "create_topic", description: `"${topic.name}" eklendi`, resultId: topic.id } };
    }
    case "update_topic_progress": {
      const [updated] = await db.update(topicsTable).set({
        progress: args.progress !== undefined ? Number(args.progress) : undefined,
        status: args.status ? (String(args.status) as any) : undefined,
      }).where(eq(topicsTable.id, Number(args.topicId))).returning();
      return { result: "Güncellendi", action: { action: "update_topic", description: `"${updated.name}" güncellendi`, resultId: updated.id } };
    }
    case "delete_topic": {
        const [deleted] = await db.delete(topicsTable).where(eq(topicsTable.id, Number(args.topicId))).returning();
        return { result: "Silindi", action: { action: "delete_topic", description: `"${deleted.name}" silindi` } };
    }
    case "create_note": {
        const [note] = await db.insert(notesTable).values({
            title: String(args.title),
            content: String(args.content),
            type: String(args.type) as any,
        }).returning();
        return { result: "Not kaydedildi", action: { action: "create_note", description: `"${note.title}" kaydedildi`, resultId: note.id } };
    }
    case "delete_note": {
        const [deleted] = await db.delete(notesTable).where(eq(notesTable.id, Number(args.noteId))).returning();
        return { result: "Silindi", action: { action: "delete_note", description: `"${deleted.title}" silindi` } };
    }
    case "track_wrong_answer": {
        const [wrong] = await db.insert(wrongAnswersTable).values({
            questionText: String(args.questionText),
            type: String(args.type) as any,
            topicId: args.topicId ? Number(args.topicId) : null,
        }).returning();
        return { result: "Kaydedildi", action: { action: "track_wrong", description: `Hata kaydedildi`, resultId: wrong.id } };
    }
    case "delete_wrong_answer": {
        await db.delete(wrongAnswersTable).where(eq(wrongAnswersTable.id, Number(args.wrongAnswerId)));
        return { result: "Silindi" };
    }
    case "clear_chat_history": {
        if (sessionId) await db.delete(chatMessagesTable).where(eq(chatMessagesTable.sessionId, sessionId));
        return { result: "Sohbet temizlendi" };
    }
    case "delete_exam": {
        await db.delete(examsTable).where(eq(examsTable.id, Number(args.examId)));
        return { result: "Silindi" };
    }
    case "delete_resource": {
        await db.delete(resourcesTable).where(eq(resourcesTable.id, Number(args.resourceId)));
        return { result: "Silindi" };
    }
    case "delete_chat_session": {
        const targetId = Number(args.sessionId);
        if (targetId === sessionId) return { result: "HATA: Aktif oturum silinemez." };
        await db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, targetId));
        return { result: "Oturum silindi" };
    }
    case "clear_all_data": {
        await Promise.all([
            db.delete(topicsTable),
            db.delete(wrongAnswersTable),
            db.delete(notesTable),
            db.delete(examsTable),
            db.delete(resourcesTable),
        ]);
        return { result: "Tüm sistem verileri sıfırlandı." };
    }
    case "list_workspace_files": {
        const targetPath = args.path ? String(args.path) : ".";
        const fullPath = join(process.cwd(), targetPath);
        if (!fullPath.startsWith(process.cwd())) return { result: "HATA: Yetkisiz erişim." };
        const { execSync } = await import("child_process");
        try {
            const files = execSync(`ls -p ${fullPath}`).toString();
            return { result: files };
        } catch (e: any) { return { result: "Hata: " + e.message }; }
    }
    case "read_workspace_file": {
        const fullPath = join(process.cwd(), String(args.filePath));
        if (!fullPath.startsWith(process.cwd())) return { result: "HATA: Yetkisiz erişim." };
        if (!existsSync(fullPath)) return { result: "Dosya bulunamadı." };
        return { result: readFileSync(fullPath, "utf-8").slice(0, 5000) };
    }
    case "delete_workspace_file": {
        const fullPath = join(process.cwd(), String(args.filePath));
        if (!fullPath.startsWith(process.cwd()) || fullPath.includes("server/src") || fullPath.includes(".db")) return { result: "HATA: Yetkisiz silme." };
        if (!existsSync(fullPath)) return { result: "Dosya bulunamadı." };
        const { unlinkSync } = await import("fs");
        unlinkSync(fullPath);
        return { result: "Dosya silindi." };
    }
    case "execute_workspace_command": {
        const cmd = String(args.command);
        const allowed = [/ls/i, /npm/i, /grep/i, /find/i, /rm/i, /cat/i, /echo/i, /pwd/i];
        if (!allowed.some(p => p.test(cmd)) || (cmd.includes("rm") && cmd.includes("src"))) return { result: "HATA: Yasaklı komut." };
        const { execSync } = await import("child_process");
        try {
            return { result: execSync(cmd, { timeout: 10000 }).toString() || "Tamam" };
        } catch (e: any) { return { result: "Hata: " + e.message }; }
    }
    default:
      return { result: "Bilinmeyen fonksiyon" };
  }
}
