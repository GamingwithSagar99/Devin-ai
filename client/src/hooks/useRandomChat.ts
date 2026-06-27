import { useCallback, useEffect, useRef, useState } from "react";
import { createSocket, type AppSocket } from "../lib/socket";
import type {
  ChatLine,
  ChatMode,
  Profile,
  SignalPayload,
} from "../types";

export type SessionStatus =
  | "idle"
  | "searching"
  | "matched"
  | "partner-left";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

interface SignalMessage {
  kind: "description" | "candidate";
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface RandomChatState {
  connected: boolean;
  onlineCount: number;
  status: SessionStatus;
  mode: ChatMode | null;
  partner: Profile | null;
  lines: ChatLine[];
  partnerTyping: boolean;
  micEnabled: boolean;
  voiceConnected: boolean;
  micError: string | null;
}

export interface RandomChatApi extends RandomChatState {
  start: (mode: ChatMode, profile: Profile) => void;
  next: () => void;
  stop: () => void;
  sendMessage: (text: string) => void;
  setTyping: (typing: boolean) => void;
  toggleMic: () => void;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
}

export function useRandomChat(): RandomChatApi {
  const socketRef = useRef<AppSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const profileRef = useRef<Profile | null>(null);
  const modeRef = useRef<ChatMode | null>(null);

  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [mode, setMode] = useState<ChatMode | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const addLine = useCallback((line: Omit<ChatLine, "id">) => {
    setLines((prev) => [...prev, { ...line, id: makeId() }]);
  }, []);

  const teardownPeer = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setVoiceConnected(false);
  }, []);

  const sendSignal = useCallback((message: SignalMessage) => {
    socketRef.current?.emit("signal", { data: message });
  }, []);

  const setupPeer = useCallback(
    async (initiator: boolean) => {
      teardownPeer();
      setMicError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setMicError(
          "Microphone access is required for voice calls. Please allow it and try Next.",
        );
        return;
      }
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((t) => (t.enabled = true));
      setMicEnabled(true);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ kind: "candidate", payload: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          void remoteAudioRef.current.play().catch(() => undefined);
        }
      };

      pc.onconnectionstatechange = () => {
        setVoiceConnected(pc.connectionState === "connected");
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ kind: "description", payload: offer });
      }
    },
    [sendSignal, teardownPeer],
  );

  const handleSignal = useCallback(
    async ({ data }: SignalPayload) => {
      const message = data as SignalMessage | undefined;
      const pc = pcRef.current;
      if (!message || !pc) return;

      if (message.kind === "description") {
        const description = message.payload as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(description));
        if (description.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ kind: "description", payload: answer });
        }
      } else if (message.kind === "candidate") {
        try {
          await pc.addIceCandidate(
            new RTCIceCandidate(message.payload as RTCIceCandidateInit),
          );
        } catch {
          // Ignore candidates that arrive out of order.
        }
      }
    },
    [sendSignal],
  );

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("online-count", (count) => setOnlineCount(count));

    socket.on("waiting", () => setStatus("searching"));

    socket.on("matched", (payload) => {
      setStatus("matched");
      setMode(payload.mode);
      setPartner(payload.partner);
      setLines([]);
      setPartnerTyping(false);
      addLine({
        author: "system",
        text: `You're now connected with ${payload.partner.name}. Say hi!`,
        at: Date.now(),
      });
      if (payload.mode === "voice") {
        void setupPeer(payload.initiator);
      }
    });

    socket.on("message", (payload) => {
      setPartnerTyping(false);
      addLine({ author: "them", text: payload.text, at: payload.at });
    });

    socket.on("typing", (payload) => setPartnerTyping(payload.typing));

    socket.on("signal", (payload) => void handleSignal(payload));

    socket.on("partner-left", () => {
      teardownPeer();
      setPartnerTyping(false);
      setStatus("partner-left");
      addLine({
        author: "system",
        text: "Your partner has left. Click Next to meet someone new.",
        at: Date.now(),
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      teardownPeer();
    };
  }, [addLine, handleSignal, setupPeer, teardownPeer]);

  const start = useCallback((nextMode: ChatMode, profile: Profile) => {
    profileRef.current = profile;
    modeRef.current = nextMode;
    setMode(nextMode);
    setLines([]);
    setPartner(null);
    setStatus("searching");
    socketRef.current?.emit("find", { mode: nextMode, profile });
  }, []);

  const next = useCallback(() => {
    teardownPeer();
    setPartner(null);
    setPartnerTyping(false);
    setStatus("searching");
    socketRef.current?.emit("next");
    if (modeRef.current && profileRef.current) {
      socketRef.current?.emit("find", {
        mode: modeRef.current,
        profile: profileRef.current,
      });
    }
  }, [teardownPeer]);

  const stop = useCallback(() => {
    teardownPeer();
    setPartner(null);
    setPartnerTyping(false);
    setStatus("idle");
    setMode(null);
    setLines([]);
    socketRef.current?.emit("stop");
  }, [teardownPeer]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      socketRef.current?.emit("message", { text: trimmed });
      addLine({ author: "me", text: trimmed, at: Date.now() });
    },
    [addLine],
  );

  const setTyping = useCallback((typing: boolean) => {
    socketRef.current?.emit("typing", { typing });
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextEnabled = !micEnabled;
    stream.getAudioTracks().forEach((t) => (t.enabled = nextEnabled));
    setMicEnabled(nextEnabled);
  }, [micEnabled]);

  return {
    connected,
    onlineCount,
    status,
    mode,
    partner,
    lines,
    partnerTyping,
    micEnabled,
    voiceConnected,
    micError,
    start,
    next,
    stop,
    sendMessage,
    setTyping,
    toggleMic,
    remoteAudioRef,
  };
}
