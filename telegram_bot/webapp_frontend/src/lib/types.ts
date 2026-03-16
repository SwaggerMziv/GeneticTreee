export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SSEEvent {
  type:
    | "status"
    | "question"
    | "relative_detected"
    | "story_preview"
    | "insufficient_data"
    | "error"
    | "done";
  content?: string;
  question_count?: number;
  can_create_story?: boolean;
  title?: string;
  text?: string;
  name?: string;
  probable_role?: string;
  context?: string;
}

export interface AuthResponse {
  token: string;
  relative_id: number;
  telegram_user_id: number;
  first_name: string;
  last_name: string;
  relative_name: string;
}

export interface InterviewHistory {
  messages: ChatMessage[];
  question_count: number;
  can_create_story: boolean;
  relative_name: string;
}

export interface Story {
  key: string;
  title: string;
  text: string;
  media: StoryMedia[];
  created_at: string | null;
  updated_at: string | null;
}

export interface StoryMedia {
  url: string;
  type: string;
}

export interface Stats {
  my_stories: number;
  related_relatives: number;
  relatives_stories: number;
  total_stories: number;
}

export interface Settings {
  broadcast_enabled: boolean;
  name: string;
  added_at: string | null;
}

export type InterviewMode = "voice" | "text";

export interface VoiceModeState {
  phase: "idle" | "listening" | "processing" | "speaking";
  lastAiText: string;
}

export interface DetectedRelative {
  name: string;
  probable_role: string;
  context: string;
}

export interface PendingStory {
  title: string;
  text: string;
}

// ─── Realtime WebSocket Types ───

export type RealtimePhase = "idle" | "connecting" | "listening" | "speaking";

export interface RealtimeState {
  phase: RealtimePhase;
  isConnected: boolean;
  userTranscript: string;
  aiTranscript: string;
  questionCount: number;
  canCreateStory: boolean;
  error: string | null;
}

/** Messages sent from frontend → backend WS */
export type WSOutgoingMessage =
  | { type: "audio"; data: string }
  | { type: "text"; text: string }
  | { type: "control"; action: "start" | "stop" | "interrupt" }
  | { type: "story_action"; action: "save" | "discard" | "continue" };

/** Messages received from backend → frontend WS */
export type WSIncomingMessage =
  | { type: "audio"; data: string }
  | { type: "user_transcript"; text: string; final: boolean }
  | { type: "ai_transcript"; text: string; final: boolean }
  | { type: "status"; phase: RealtimePhase }
  | { type: "relative_detected"; name: string; probable_role: string; context: string }
  | { type: "story_preview"; title: string; text: string }
  | { type: "question_count"; count: number; can_create_story: boolean }
  | { type: "error"; content: string }
  | { type: "connected"; session_restored: boolean };
