import { useQuery, useMutation, type UseQueryResult } from "@tanstack/react-query";

const BASE = "/api";

async function req<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

// ── Query key factories ───────────────────────────────────

export const getListTopicsQueryKey = () => ["topics"] as const;
export const getListResourcesQueryKey = () => ["resources"] as const;
export const getListChatSessionsQueryKey = () => ["chat-sessions"] as const;
export const getListMessagesQueryKey = (sessionId: number) => ["messages", sessionId] as const;
export const getGetDashboardSummaryQueryKey = () => ["dashboard"] as const;
export const getListWrongAnswersQueryKey = () => ["wrong-answers"] as const;
export const getListExamsQueryKey = () => ["exams"] as const;
export const getGetExamQueryKey = (id: number) => ["exam", id] as const;
export const getListNotesQueryKey = () => ["notes"] as const;
export const getGetSettingsQueryKey = () => ["settings"] as const;

// ── Types ────────────────────────────────────────────────

export type Topic = {
  id: number; name: string; subject: string | null;
  progress: number; status: "not_started" | "in_progress" | "completed";
  createdAt: string; updatedAt: string;
};
export type Resource = {
  id: number; url: string; title: string; type: "video" | "playlist";
  thumbnailUrl: string | null; videoId: string | null;
  topicId: number | null; topicName: string | null; notes: string | null; createdAt: string;
};
export type ChatSession = {
  id: number; title: string; topicId: number | null; topicName: string | null;
  messageCount: number; createdAt: string; updatedAt: string;
};
export type Message = { id: number; sessionId: number; role: "user" | "model"; content: string; createdAt: string; };
export type WrongAnswer = {
  id: number; questionText: string; type: "wrong" | "blank";
  topicId: number | null; topicName: string | null; examId: number | null;
  notes: string | null; isCorrected: boolean; correctedAt: string | null;
  lastSeenAt: string | null; createdAt: string;
};
export type ExamQuestion = { id: number; examId: number; questionNumber: number; status: "correct" | "wrong" | "blank"; notes: string | null; };
export type Exam = {
  id: number; title: string; publisher: string | null; topicId: number | null; topicName: string | null;
  totalQuestions: number; wrongCount: number; blankCount: number; correctCount: number;
  hasPdf: boolean; analysisResult?: string | null; createdAt: string; questions?: ExamQuestion[];
};
export type Note = { id: number; title: string; content: string; type: "note" | "list" | "checklist" | "table" | "schedule"; createdAt: string; updatedAt: string; };
export type Settings = { id: number; hasApiKey: boolean; geminiApiKey: string | null; userName: string | null; studyGoal: string | null; dailyStudyMinutes: number; };
export type DashboardSummary = {
  totalTopics: number; completedTopics: number; inProgressTopics: number;
  totalResources: number; totalChatSessions: number; hasApiKey: boolean;
  recentSessions: ChatSession[]; topicProgress: Topic[];
};

// ── Topics ───────────────────────────────────────────────

export const useListTopics = (): UseQueryResult<Topic[]> =>
  useQuery({ queryKey: getListTopicsQueryKey(), queryFn: () => req<Topic[]>("GET", "/topics") });

export const useCreateTopic = () =>
  useMutation({ mutationFn: (data: { name: string; subject?: string }) => req<Topic>("POST", "/topics", data) });

export const useUpdateTopic = () =>
  useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Topic> }) => req<Topic>("PATCH", `/topics/${id}`, data) });

export const useDeleteTopic = () =>
  useMutation({ mutationFn: ({ id }: { id: number }) => req<{ success: boolean }>("DELETE", `/topics/${id}`) });

// ── Resources ────────────────────────────────────────────

export const useListResources = (): UseQueryResult<Resource[]> =>
  useQuery({ queryKey: getListResourcesQueryKey(), queryFn: () => req<Resource[]>("GET", "/resources") });

export const useAddResource = () =>
  useMutation({ mutationFn: (data: { url: string; title: string; topicId?: number }) => req<Resource>("POST", "/resources", data) });

export const useDeleteResource = () =>
  useMutation({ mutationFn: ({ id }: { id: number }) => req<{ success: boolean }>("DELETE", `/resources/${id}`) });

// ── Chat ─────────────────────────────────────────────────

export const useListChatSessions = (): UseQueryResult<ChatSession[]> =>
  useQuery({ queryKey: getListChatSessionsQueryKey(), queryFn: () => req<ChatSession[]>("GET", "/chat/sessions") });

export const useCreateChatSession = () =>
  useMutation({ mutationFn: (data: { title: string; topicId?: number }) => req<ChatSession>("POST", "/chat/sessions", data) });

export const useListMessages = (sessionId: number): UseQueryResult<Message[]> =>
  useQuery({ queryKey: getListMessagesQueryKey(sessionId), queryFn: () => req<Message[]>("GET", `/chat/sessions/${sessionId}/messages`) });

export const useSendMessage = () =>
  useMutation({ mutationFn: ({ sessionId, content }: { sessionId: number; content: string }) => req<Message>("POST", `/chat/sessions/${sessionId}/messages`, { content }) });

// ── Dashboard ────────────────────────────────────────────

export const useGetDashboardSummary = (): UseQueryResult<DashboardSummary> =>
  useQuery({ queryKey: getGetDashboardSummaryQueryKey(), queryFn: () => req<DashboardSummary>("GET", "/dashboard/summary") });

// ── Wrong Answers ────────────────────────────────────────

export const useListWrongAnswers = (): UseQueryResult<WrongAnswer[]> =>
  useQuery({ queryKey: getListWrongAnswersQueryKey(), queryFn: () => req<WrongAnswer[]>("GET", "/wrong-answers") });

export const useCreateWrongAnswer = () =>
  useMutation({ mutationFn: (data: { questionText: string; type?: "wrong" | "blank"; topicId?: number; examId?: number; notes?: string }) => req<WrongAnswer>("POST", "/wrong-answers", data) });

export const useUpdateWrongAnswer = () =>
  useMutation({ mutationFn: ({ id, data }: { id: number; data: { notes?: string; isCorrected?: boolean; lastSeenAt?: string } }) => req<WrongAnswer>("PATCH", `/wrong-answers/${id}`, data) });

export const useDeleteWrongAnswer = () =>
  useMutation({ mutationFn: ({ id }: { id: number }) => req<{ success: boolean }>("DELETE", `/wrong-answers/${id}`) });

// ── Exams ────────────────────────────────────────────────

export const useListExams = (): UseQueryResult<Exam[]> =>
  useQuery({ queryKey: getListExamsQueryKey(), queryFn: () => req<Exam[]>("GET", "/exams") });

export const useGetExam = (id: number): UseQueryResult<Exam> =>
  useQuery({ queryKey: getGetExamQueryKey(id), queryFn: () => req<Exam>("GET", `/exams/${id}`) });

export const useCreateExam = () =>
  useMutation({ mutationFn: ({ data }: { data: any }) => req<Exam>("POST", "/exams", data) });

export const useDeleteExam = () =>
  useMutation({ mutationFn: ({ id }: { id: number }) => req<{ success: boolean }>("DELETE", `/exams/${id}`) });

export const useSaveExamQuestions = () =>
  useMutation({ mutationFn: ({ id, questions }: { id: number; questions: Array<{ questionNumber: number; status: "correct" | "wrong" | "blank"; notes?: string | null }> }) =>
    req<Exam>("PUT", `/exams/${id}/questions`, { questions }) });

export const useAnalyzeExam = () =>
  useMutation({ mutationFn: ({ id }: { id: number }) => req<{ analysis: string }>("POST", `/exams/${id}/analyze`) });

// ── Notes ────────────────────────────────────────────────

export const useListNotes = (): UseQueryResult<Note[]> =>
  useQuery({ queryKey: getListNotesQueryKey(), queryFn: () => req<Note[]>("GET", "/notes") });

export const useCreateNote = () =>
  useMutation({ mutationFn: (data: { title: string; content?: string; type?: Note["type"] }) => req<Note>("POST", "/notes", data) });

export const useUpdateNote = () =>
  useMutation({ mutationFn: ({ id, data }: { id: number; data: { title?: string; content?: string } }) => req<Note>("PATCH", `/notes/${id}`, data) });

export const useDeleteNote = () =>
  useMutation({ mutationFn: ({ id }: { id: number }) => req<{ success: boolean }>("DELETE", `/notes/${id}`) });

// ── Settings ─────────────────────────────────────────────

export const useGetSettings = (): UseQueryResult<Settings> =>
  useQuery({ queryKey: getGetSettingsQueryKey(), queryFn: () => req<Settings>("GET", "/settings") });

export const useUpdateSettings = () =>
  useMutation({ mutationFn: (data: { geminiApiKey?: string; userName?: string; studyGoal?: string; dailyStudyMinutes?: number }) => req<Settings>("PUT", "/settings", data) });

// ── AI ───────────────────────────────────────────────────

export const useAiAgent = () =>
  useMutation({
    mutationFn: (data: { message: string; fileBase64?: string; fileMimeType?: string; history?: Array<{ role: string; content: string }> }) =>
      req<{ reply: string; actionsPerformed: Array<{ action: string; description: string; resultId?: number | null }> }>("POST", "/ai/agent", data),
  });
