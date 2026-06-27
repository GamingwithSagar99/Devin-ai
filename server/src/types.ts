export type ChatMode = "chat" | "voice";

export type Gender = "male" | "female" | "other" | "prefer-not-to-say";

export interface Profile {
  name: string;
  age: number | null;
  gender: Gender | "";
  interests: string[];
}

export interface FindPayload {
  mode: ChatMode;
  profile: Profile;
}

export interface MatchedPayload {
  roomId: string;
  mode: ChatMode;
  partner: Profile;
  /** Whether this peer should create the WebRTC offer (voice mode only). */
  initiator: boolean;
}

export interface ChatMessagePayload {
  text: string;
}

export interface IncomingChatMessage extends ChatMessagePayload {
  /** Server timestamp in epoch milliseconds. */
  at: number;
}

export interface SignalPayload {
  /** Opaque WebRTC signaling data (SDP description or ICE candidate). */
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
  find: (payload: FindPayload) => void;
  message: (payload: ChatMessagePayload) => void;
  typing: (payload: { typing: boolean }) => void;
  signal: (payload: SignalPayload) => void;
  next: () => void;
  stop: () => void;
}
