import { z } from "zod";


export const HealthCheckResponse = z.object({ status: z.literal("ok") });

const DateString = z.union([z.string(), z.date()]).transform((v: any) => 
  v instanceof Date ? v.toISOString() : v
);
const DateStringOpt = DateString.optional();
const DateStringNull = DateString.nullable();

export const TopicSchema = z.object({
  id: z.number(),
  name: z.string(),
  subject: z.string().nullable(),
  progress: z.number(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  createdAt: DateString,
  updatedAt: DateStringOpt,
});
export const ListTopicsResponse = z.array(TopicSchema);
export const CreateTopicBody = z.object({ name: z.string().min(1), subject: z.string().optional() });
export const UpdateTopicBody = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
});
export const UpdateTopicResponse = TopicSchema;
export const DeleteTopicResponse = z.object({ success: z.boolean() });

export const ResourceSchema = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  type: z.enum(["video", "playlist"]),
  thumbnailUrl: z.string().nullable(),
  videoId: z.string().nullable(),
  topicId: z.number().nullable(),
  topicName: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: DateString,
});
export const ListResourcesResponse = z.array(ResourceSchema);
export const AddResourceBody = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  topicId: z.number().optional(),
});
export const DeleteResourceResponse = z.object({ success: z.boolean() });

export const ChatSessionSchema = z.object({
  id: z.number(),
  title: z.string(),
  topicId: z.number().nullable(),
  topicName: z.string().nullable(),
  messageCount: z.number(),
  createdAt: DateString,
  updatedAt: DateString,
});
export const ListChatSessionsResponse = z.array(ChatSessionSchema);
export const CreateChatSessionBody = z.object({
  title: z.string().min(1),
  topicId: z.number().optional(),
});

export const MessageSchema = z.object({
  id: z.number(),
  sessionId: z.number(),
  role: z.enum(["user", "model"]),
  content: z.string(),
  createdAt: DateString,
});
export const ListMessagesResponse = z.array(MessageSchema);
export const SendMessageBody = z.object({ content: z.string().min(1) });
export const SendMessageResponse = MessageSchema;

export const GetDashboardSummaryResponse = z.object({
  totalTopics: z.number(),
  completedTopics: z.number(),
  inProgressTopics: z.number(),
  totalResources: z.number(),
  totalChatSessions: z.number(),
  hasApiKey: z.boolean(),
  recentSessions: z.array(ChatSessionSchema),
  topicProgress: z.array(TopicSchema),
});

export const WrongAnswerSchema = z.object({
  id: z.number(),
  questionText: z.string(),
  type: z.enum(["wrong", "blank"]),
  topicId: z.number().nullable(),
  topicName: z.string().nullable(),
  examId: z.number().nullable(),
  notes: z.string().nullable(),
  isCorrected: z.boolean(),
  correctedAt: DateStringNull,
  lastSeenAt: DateStringNull,
  createdAt: DateString,
});
export const ListWrongAnswersResponse = z.array(WrongAnswerSchema);
export const CreateWrongAnswerBody = z.object({
  questionText: z.string().min(1),
  type: z.enum(["wrong", "blank"]).optional(),
  topicId: z.number().optional(),
  examId: z.number().optional(),
  notes: z.string().optional(),
});
export const UpdateWrongAnswerBody = z.object({
  notes: z.string().nullable().optional(),
  isCorrected: z.boolean().optional(),
  lastSeenAt: z.string().nullable().optional(),
});
export const UpdateWrongAnswerResponse = WrongAnswerSchema;
export const DeleteWrongAnswerResponse = z.object({ success: z.boolean() });

export const ExamQuestionSchema = z.object({
  id: z.number(),
  examId: z.number(),
  questionNumber: z.number(),
  status: z.enum(["correct", "wrong", "blank"]),
  notes: z.string().nullable(),
});
export const ExamSchema = z.object({
  id: z.number(),
  title: z.string(),
  publisher: z.string().nullable(),
  topicId: z.number().nullable(),
  topicName: z.string().nullable(),
  totalQuestions: z.number(),
  wrongCount: z.number(),
  blankCount: z.number(),
  correctCount: z.number(),
  hasPdf: z.boolean(),
  analysisResult: z.string().nullable().optional(),
  createdAt: DateString,
  questions: z.array(ExamQuestionSchema).optional(),
});
export const ListExamsResponse = z.array(ExamSchema);
export const CreateExamBody = z.object({
  title: z.string().min(1),
  publisher: z.string().optional(),
  topicId: z.number().optional(),
  totalQuestions: z.number().min(1),
  pdfBase64: z.string().optional(),
});
export const DeleteExamResponse = z.object({ success: z.boolean() });
export const SaveExamQuestionsBody = z.object({
  questions: z.array(z.object({
    questionNumber: z.number(),
    status: z.enum(["correct", "wrong", "blank"]),
    notes: z.string().nullable().optional(),
  })),
});

export const NoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  type: z.enum(["note", "list", "checklist", "table", "schedule"]),
  createdAt: DateString,
  updatedAt: DateString,
});
export const ListNotesResponse = z.array(NoteSchema);
export const CreateNoteBody = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  type: z.enum(["note", "list", "checklist", "table", "schedule"]).optional(),
});
export const UpdateNoteBody = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});
export const UpdateNoteResponse = NoteSchema;
export const DeleteNoteResponse = z.object({ success: z.boolean() });

export const SettingsSchema = z.object({
  id: z.number(),
  hasApiKey: z.boolean(),
  geminiApiKey: z.string().nullable(),
  userName: z.string().nullable(),
  studyGoal: z.string().nullable(),
  dailyStudyMinutes: z.number(),
});
export const GetSettingsResponse = SettingsSchema;
export const UpdateSettingsBody = z.object({
  geminiApiKey: z.string().optional(),
  userName: z.string().optional(),
  studyGoal: z.string().optional(),
  dailyStudyMinutes: z.number().optional(),
});
export const UpdateSettingsResponse = SettingsSchema;

export const AiChatBody = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  context: z.object({
    userName: z.string().nullable().optional(),
    studyGoal: z.string().nullable().optional(),
    topicCount: z.number().optional(),
    examCount: z.number().optional(),
    wrongAnswerCount: z.number().optional(),
    currentPage: z.string().optional(),
  }).optional(),
});
export const AiChatResponse = z.object({
  reply: z.string(),
  suggestedNote: z.object({
    title: z.string(),
    content: z.string(),
    type: z.enum(["note", "table", "schedule", "list"]),
  }).nullable().optional(),
});

export const AiAgentBody = z.object({
  message: z.string().min(1),
  fileBase64: z.string().optional(),
  fileMimeType: z.string().optional(),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  sessionId: z.number().optional(),
  language: z.enum(["en", "tr"]).default("en"),
});
export const AiAgentResponse = z.object({
  reply: z.string(),
  actionsPerformed: z.array(z.object({
    action: z.string(),
    description: z.string(),
    resultId: z.number().nullable().optional(),
  })),
});
