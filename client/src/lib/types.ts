export interface Topic {
  id: number; name: string; subject: string | null;
  progress: number; status: "not_started" | "in_progress" | "completed";
  createdAt: string; updatedAt?: string;
}
export interface Resource {
  id: number; url: string; title: string; type: "video" | "playlist";
  thumbnailUrl: string | null; videoId: string | null;
  topicId: number | null; topicName: string | null;
  notes: string | null; createdAt: string;
}
export interface ChatSession {
  id: number; title: string; topicId: number | null; topicName: string | null;
  messageCount: number; createdAt: string; updatedAt: string;
}
export interface Message {
  id: number; sessionId: number; role: "user" | "model";
  content: string; createdAt: string;
}
export interface WrongAnswer {
  id: number; questionText: string; type: "wrong" | "blank";
  topicId: number | null; topicName: string | null; examId: number | null;
  notes: string | null; isCorrected: boolean;
  correctedAt: string | null; lastSeenAt: string | null; createdAt: string;
}
export interface ExamQuestion {
  id: number; examId: number; questionNumber: number;
  status: "correct" | "wrong" | "blank"; notes: string | null;
}
export interface Exam {
  id: number; title: string; publisher: string | null;
  topicId: number | null; topicName: string | null;
  totalQuestions: number; wrongCount: number; blankCount: number; correctCount: number;
  hasPdf: boolean; analysisResult?: string | null; createdAt: string;
  questions?: ExamQuestion[];
}
export interface Note {
  id: number; title: string; content: string;
  type: "note" | "list" | "checklist" | "table" | "schedule";
  createdAt: string; updatedAt: string;
}
export interface Settings {
  id: number; hasApiKey: boolean; geminiApiKey: string | null;
  userName: string | null; studyGoal: string | null; dailyStudyMinutes: number;
}
export interface DashboardSummary {
  totalTopics: number; completedTopics: number; inProgressTopics: number;
  totalResources: number; totalChatSessions: number; hasApiKey: boolean;
  recentSessions: ChatSession[]; topicProgress: Topic[];
}
