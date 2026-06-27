export type ChatMode = "chat" | "voice";

export type Gender = "male" | "female" | "other" | "prefer-not-to-say";

export interface Profile {
  name: string;
  age: number | null;
  gender: Gender | "";
  interests: string[];
}

export interface MatchedPayload {
  roomId: string;
  mode: ChatMode;
  partner: Profile;
  initiator: boolean;
}

export interface IncomingChatMessage {
  text: string;
  at: number;
}

export interface SignalPayload {
  data: unknown;
}

export interface ServerToClientEvents {
  waiting: () => void;
  matched: (payload: MatchedPayload) => void;
  message: (payload: IncomingChatMessage) => void;
  typing: (payload: { typing: boolean }) => void;
  signal: (payload: SignalPayload) => void;
  "partner-left": () => void;
  "online-count": (count: number) => void;
}

export interface ClientToServerEvents {
  find: (payload: { mode: ChatMode; profile: Profile }) => void;
  message: (payload: { text: string }) => void;
  typing: (payload: { typing: boolean }) => void;
  signal: (payload: SignalPayload) => void;
  next: () => void;
  stop: () => void;
}

/** A chat message as rendered locally (includes who sent it). */
export interface ChatLine {
  id: string;
  author: "me" | "them" | "system";
  text: string;
  at: number;
}
